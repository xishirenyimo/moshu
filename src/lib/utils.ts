import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const AUTH_ERROR_MAP: Record<string, string> = {
  'Invalid login credentials': '邮箱或密码错误',
  'Email rate limit exceeded': '发送过于频繁，请稍后再试',
  'User already registered': '该邮箱已注册',
  'Password should be at least 6 characters': '密码至少需要6个字符',
  'For security purposes, you can only request this once every 60 seconds': '请求过于频繁，请60秒后再试',
  'Email link is invalid or has expired': '链接已过期或无效',
  'User not found': '用户不存在',
  'Email not confirmed': '邮箱尚未验证',
}

export function transAuthError(message: string): string {
  for (const [en, zh] of Object.entries(AUTH_ERROR_MAP)) {
    if (message.includes(en)) return zh
  }
  return message
}
