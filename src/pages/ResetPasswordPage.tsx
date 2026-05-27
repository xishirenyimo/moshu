import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { resetPasswordSchema, type ResetPasswordInput } from '@/validators/authSchemas'
import { supabase } from '@/lib/supabase'
import { transAuthError } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { LoadingSpinner } from '@/components/LoadingSpinner'

export default function ResetPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  })

  const onSubmit = async (data: ResetPasswordInput) => {
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(data.email)
    setLoading(false)

    if (error) {
      toast.error(transAuthError(error.message))
    } else {
      setSent(true)
      toast.success('重置邮件已发送')
    }
  }

  if (sent) {
    return (
      <Card className="w-full max-w-sm rounded-2xl shadow-lg border-border/50">
        <CardContent className="text-center py-10">
          <p className="text-muted-foreground mb-4">重置邮件已发送，请检查邮箱。</p>
          <Link to="/login" className="text-primary hover:underline text-sm font-medium">
            返回登录
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-sm rounded-2xl shadow-lg border-border/50">
      <CardHeader className="text-center pb-6">
        <CardTitle className="text-3xl font-serif font-bold tracking-wider">墨属</CardTitle>
        <CardDescription className="mt-1.5">重置密码</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <Input id="email" type="email" {...register('email')} placeholder="you@example.com" className="rounded-xl" />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <Button type="submit" className="w-full rounded-full gap-2" disabled={loading}>
            {loading && <LoadingSpinner />}
            {loading ? '发送中...' : '发送重置邮件'}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm">
          <Link to="/login" className="text-primary hover:underline font-medium">返回登录</Link>
        </p>
      </CardContent>
    </Card>
  )
}
