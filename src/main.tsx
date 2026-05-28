import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { queryClient } from '@/queries/queryClient'
import { router } from '@/router'
import './index.css'

let lastUserId: string | undefined

function resolveName(meta?: Record<string, unknown>, profileName?: string | null, email?: string) {
  return (meta?.display_name as string)
    || (meta?.displayName as string)
    || profileName
    || email?.split('@')[0]
    || email
    || ''
}

function App() {
  const setUser = useAuthStore((s) => s.setUser)
  const setDisplayName = useAuthStore((s) => s.setDisplayName)

  useEffect(() => {
    let cancelled = false

    const loadProfileName = async (userId: string) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase.from('profiles') as any)
          .select('display_name').eq('id', userId).maybeSingle()
        return (data?.display_name ?? null) as string | null
      } catch {
        return null
      }
    }

    const handleSession = async (user: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null) => {
      if (!user) {
        setUser(null)
        setDisplayName('')
        queryClient.clear()
        lastUserId = undefined
        return
      }

      if (lastUserId && lastUserId !== user.id) {
        queryClient.clear()
      }
      lastUserId = user.id

      setUser(user as never)
      const profileName = await loadProfileName(user.id)
      if (cancelled) return
      const name = resolveName(user.user_metadata, profileName, user.email)
      setDisplayName(name)
    }

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (cancelled) return
        await handleSession(session?.user ?? null)
      } catch {
        if (!cancelled) handleSession(null)
      }
    }
    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      await handleSession(session?.user ?? null)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [setUser, setDisplayName])

  return (
    <>
      <RouterProvider router={router} />
      <Toaster
        position="bottom-right"
        gap={8}
        toastOptions={{
          duration: 2500,
          classNames: {
            toast: 'md:bottom-4 md:right-4 max-sm:top-4 max-sm:left-1/2 max-sm:-translate-x-1/2 rounded-xl border-border/50 shadow-lg',
            title: 'text-sm font-medium',
            description: 'text-xs text-muted-foreground',
          },
        }}
      />
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
)
