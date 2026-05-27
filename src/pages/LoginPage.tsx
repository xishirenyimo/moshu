import { useState } from 'react'
import { Link, useNavigate, Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginInput } from '@/validators/authSchemas'
import { supabase } from '@/lib/supabase'
import { transAuthError } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { LoadingSpinner } from '@/components/LoadingSpinner'

export default function LoginPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  if (user) return <Navigate to="/books" replace />

  const onSubmit = async (data: LoginInput) => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })
    setLoading(false)

    if (error) {
      toast.error(transAuthError(error.message))
    } else {
      navigate('/books')
    }
  }

  return (
    <Card className="w-full max-w-sm rounded-2xl shadow-lg border-border/50">
      <CardHeader className="text-center pb-6">
        <CardTitle className="text-3xl font-serif font-bold tracking-wider">墨属</CardTitle>
        <CardDescription className="mt-1.5">登录你的图书库</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <Input id="email" type="email" {...register('email')} placeholder="you@example.com" className="rounded-xl" />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <Input id="password" type="password" {...register('password')} placeholder="输入密码" className="rounded-xl" />
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>
          <Button type="submit" className="w-full rounded-full gap-2" disabled={loading}>
            {loading && <LoadingSpinner />}
            {loading ? '登录中...' : '登录'}
          </Button>
        </form>
        <div className="mt-6 text-center text-sm space-y-2">
          <p>
            <Link to="/register" className="text-primary hover:underline font-medium">没有账号？去注册</Link>
          </p>
          <p>
            <Link to="/reset-password" className="text-muted-foreground hover:underline text-xs">忘记密码？</Link>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
