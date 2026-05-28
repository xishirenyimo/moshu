import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

interface BookResult {
  found: boolean
  error?: 'invalid_isbn' | 'not_found' | 'service_unavailable'
  book?: {
    isbn: string
    title: string
    authors: string[]
    publisher: string | null
    language: string | null
    total_pages: number | null
    cover_path: string | null
    source: 'google_books' | 'open_library'
  }
}

function cleanISBN(raw: string): string {
  return raw.replace(/[-\s]/g, '')
}

function isValidISBN(isbn: string): boolean {
  const digits = cleanISBN(isbn)
  if (digits.length === 10) {
    let sum = 0
    for (let i = 0; i < 10; i++) {
      const c = digits[i]
      const v = c === 'X' || c === 'x' ? 10 : parseInt(c, 10)
      if (isNaN(v)) return false
      sum += (10 - i) * v
    }
    return sum % 11 === 0
  }
  if (digits.length === 13) {
    let sum = 0
    for (let i = 0; i < 13; i++) {
      const v = parseInt(digits[i], 10)
      if (isNaN(v)) return false
      sum += (i % 2 === 0 ? 1 : 3) * v
    }
    return sum % 10 === 0
  }
  return false
}

async function fetchCoverDataUrl(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    const bytes = new Uint8Array(buf)
    // Process in chunks to avoid stack overflow
    const chunkSize = 8192
    let binary = ''
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize)
      binary += String.fromCharCode(...chunk)
    }
    const base64 = btoa(binary)
    const contentType = res.headers.get('content-type') || 'image/jpeg'
    return `data:${contentType};base64,${base64}`
  } catch {
    return null
  }
}

async function searchOpenLibrary(isbn: string): Promise<BookResult['book'] | null> {
  const url = `https://openlibrary.org/isbn/${isbn}.json`
  const res = await fetch(url)
  if (!res.ok) return null

  const data = await res.json()
  const title: string | undefined = data.title
  if (!title) return null

  let authors: string[] = []
  if (Array.isArray(data.authors)) {
    authors = await Promise.all(
      data.authors.map(async (a: { key: string }) => {
        try {
          const ar = await fetch(`https://openlibrary.org${a.key}.json`)
          if (ar.ok) {
            const ad = await ar.json()
            return ad.name as string
          }
        } catch { /* skip */ }
        return ''
      })
    ).then(names => names.filter(Boolean))
  }

  const publisher: string | null =
    (Array.isArray(data.publishers) ? data.publishers[0] : data.publishers) ?? null

  const coverUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`

  return {
    isbn,
    title,
    authors,
    publisher,
    language: null,
    total_pages: data.number_of_pages ?? null,
    cover_path: coverUrl,  // Will be converted to data URL later
    source: 'open_library',
  }
}

async function searchGoogleBooks(isbn: string): Promise<BookResult['book'] | null> {
  const apiKey = Deno.env.get('GOOGLE_BOOKS_API_KEY')
  if (!apiKey) return null

  const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${apiKey}`
  const res = await fetch(url)
  if (!res.ok) return null

  const data = await res.json()
  if (!data.items?.length) return null

  const vi = data.items[0].volumeInfo
  const rawCoverUrl = vi.imageLinks?.thumbnail?.replace('http://', 'https://') ?? null

  return {
    isbn,
    title: vi.title ?? '未知书名',
    authors: vi.authors ?? [],
    publisher: vi.publisher ?? null,
    language: vi.language ?? null,
    total_pages: vi.pageCount ?? null,
    cover_path: rawCoverUrl,  // Will be converted to data URL later if needed
    source: 'google_books',
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, X-Client-Info',
      },
    })
  }

  try {
    const { isbn } = await req.json() as { isbn?: string }

    if (!isbn || typeof isbn !== 'string') {
      return Response.json(
        { found: false, error: 'invalid_isbn' } satisfies BookResult,
        { headers: { 'Access-Control-Allow-Origin': '*' } },
      )
    }

    const cleaned = cleanISBN(isbn)
    if (!isValidISBN(cleaned)) {
      return Response.json(
        { found: false, error: 'invalid_isbn' } satisfies BookResult,
        { headers: { 'Access-Control-Allow-Origin': '*' } },
      )
    }

    // Search Google Books and OpenLibrary in parallel
    const [googleResult, openResult] = await Promise.all([
      searchGoogleBooks(cleaned),
      searchOpenLibrary(cleaned),
    ])

    const result = googleResult ?? openResult
    if (result) {
      // Convert cover URL to data URL (server-side proxy to bypass CDN blocks)
      if (result.cover_path && /^https?:\/\//.test(result.cover_path)) {
        const dataUrl = await fetchCoverDataUrl(result.cover_path)
        if (dataUrl) {
          result.cover_path = dataUrl
        }
      }
      // Fallback to OpenLibrary cover
      if (!result.cover_path) {
        const fallbackCover = `https://covers.openlibrary.org/b/isbn/${cleaned}-M.jpg`
        result.cover_path = await fetchCoverDataUrl(fallbackCover)
      }
      return Response.json(
        { found: true, book: result } satisfies BookResult,
        { headers: { 'Access-Control-Allow-Origin': '*' } },
      )
    }

    return Response.json(
      { found: false, error: 'not_found' } satisfies BookResult,
      { headers: { 'Access-Control-Allow-Origin': '*' } },
    )
  } catch {
    return Response.json(
      { found: false, error: 'service_unavailable' } satisfies BookResult,
      { headers: { 'Access-Control-Allow-Origin': '*' } },
    )
  }
})
