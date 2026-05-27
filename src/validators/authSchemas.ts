import { z } from 'zod'

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, '请输入邮箱')
    .email('邮箱格式不正确'),
  password: z
    .string()
    .min(1, '请输入密码'),
})

export type LoginInput = z.infer<typeof loginSchema>

export const registerSchema = z.object({
  email: z
    .string()
    .min(1, '请输入邮箱')
    .email('邮箱格式不正确'),
  password: z
    .string()
    .min(6, '密码至少6个字符'),
  displayName: z
    .string()
    .min(1, '请输入显示名称'),
})

export type RegisterInput = z.infer<typeof registerSchema>

export const resetPasswordSchema = z.object({
  email: z
    .string()
    .min(1, '请输入邮箱')
    .email('邮箱格式不正确'),
})

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
