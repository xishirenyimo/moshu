import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { apiRpc } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { toast } from 'sonner'

export function useDeleteAccount() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)

  return useMutation({
    mutationFn: async () => {
      await apiRpc('delete_account', {})
    },
    onSuccess: () => {
      queryClient.clear()

      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k))

      setUser(null)
      navigate('/login', { replace: true })
      toast.success('账户已注销')
    },
    onError: (error) => {
      console.error('注销账户失败:', error)
      toast.error(error instanceof Error ? error.message : '注销失败，请重试')
    },
  })
}
