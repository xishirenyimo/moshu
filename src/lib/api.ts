const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

function getAccessToken(): string | null {
  try {
    const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
    if (!key) return null
    const parsed = JSON.parse(localStorage.getItem(key) || '{}')
    return parsed?.access_token ?? null
  } catch {
    return null
  }
}

function headers(): Record<string, string> {
  const token = getAccessToken()
  return {
    'apikey': supabaseAnonKey,
    'Authorization': token ? `Bearer ${token}` : `Bearer ${supabaseAnonKey}`,
    'Content-Type': 'application/json',
  }
}

async function handleResponse(res: Response) {
  if (!res.ok) {
    const body = await res.text()
    let message = body
    try { message = JSON.parse(body).message || body } catch { /* use raw */ }
    throw new Error(message)
  }
  const text = await res.text()
  if (!text) return null
  try { return JSON.parse(text) } catch { return text }
}

export function apiRpc(fn: string, params: Record<string, unknown>) {
  return fetch(`${supabaseUrl}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(params),
  }).then(handleResponse)
}

export function apiGet(path: string, query?: URLSearchParams) {
  const url = new URL(`${supabaseUrl}/rest/v1/${path}`)
  if (query) query.forEach((value, key) => url.searchParams.set(key, value))
  return fetch(url.toString(), { headers: headers() }).then(handleResponse)
}

export function apiPost(path: string, body: unknown, query?: URLSearchParams) {
  const url = new URL(`${supabaseUrl}/rest/v1/${path}`)
  if (query) query.forEach((value, key) => url.searchParams.set(key, value))
  return fetch(url.toString(), {
    method: 'POST',
    headers: { ...headers(), 'Prefer': 'return=representation' },
    body: JSON.stringify(body),
  }).then(handleResponse)
}

export function apiPatch(path: string, body: unknown, query?: URLSearchParams) {
  const url = new URL(`${supabaseUrl}/rest/v1/${path}`)
  if (query) {
    query.forEach((value, key) => url.searchParams.set(key, value))
  }
  return fetch(url.toString(), {
    method: 'PATCH',
    headers: { ...headers(), 'Prefer': 'return=representation' },
    body: JSON.stringify(body),
  }).then(handleResponse)
}

export function apiDelete(path: string, query?: URLSearchParams) {
  const url = new URL(`${supabaseUrl}/rest/v1/${path}`)
  if (query) query.forEach((value, key) => url.searchParams.set(key, value))
  return fetch(url.toString(), {
    method: 'DELETE',
    headers: headers(),
  }).then(handleResponse)
}
