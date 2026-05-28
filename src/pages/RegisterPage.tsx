import { useState } from 'react'
import { Link, useNavigate, Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema, type RegisterInput } from '@/validators/authSchemas'
import { supabase } from '@/lib/supabase'
import { transAuthError } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { LoadingSpinner } from '@/components/LoadingSpinner'

export default function RegisterPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  })

  if (user) return <Navigate to="/books" replace />

  const onSubmit = async (data: RegisterInput) => {
    setLoading(true)
    const { data: result, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { display_name: data.displayName },
      },
    })
    setLoading(false)

    if (error) {
      toast.error(transAuthError(error.message))
    } else if (result.session) {
      toast.success('注册成功')
      navigate('/books')
    } else {
      toast.info('注册成功，请查看邮箱确认链接后再登录')
      navigate('/login')
    }
  }

  return (
    <Card className="w-full max-w-sm rounded-2xl shadow-lg border-border/50">
      <CardHeader className="text-center pb-6">
        <CardTitle className="text-3xl font-serif font-bold tracking-wider">墨属</CardTitle>
        <CardDescription className="mt-1.5">创建你的图书库</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <Input id="email" type="email" {...register('email')} placeholder="you@example.com" className="rounded-xl" />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="displayName">显示名称</Label>
            <Input id="displayName" {...register('displayName')} placeholder="你的昵称" className="rounded-xl" />
            {errors.displayName && <p className="text-sm text-destructive">{errors.displayName.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <Input id="password" type="password" {...register('password')} placeholder="至少6个字符" className="rounded-xl" />
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>
          <Button type="submit" className="w-full rounded-full gap-2" disabled={loading}>
            {loading && <LoadingSpinner />}
            {loading ? '注册中...' : '注册'}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm">
          <Link to="/login" className="text-primary hover:underline font-medium">已有账号？去登录</Link>
        </p>
      </CardContent>
    </Card>
  )
}
