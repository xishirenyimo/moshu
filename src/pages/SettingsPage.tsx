import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter,
  AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { useDeleteAccount } from '@/hooks/useDeleteAccount'
import { exportAllData } from '@/lib/export'
import { importFromJSON } from '@/lib/import'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { toast } from 'sonner'

export default function SettingsPage() {
  const navigate = useNavigate()
  const [darkMode, setDarkMode] = useState(() =>
    document.documentElement.classList.contains('dark')
  )
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { mutate: deleteAccount, isPending: deleting } = useDeleteAccount()

  const handleLogout = async () => {
    useAuthStore.getState().setUser(null)
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  const toggleDarkMode = () => {
    const next = !darkMode
    setDarkMode(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const result = await importFromJSON(file)
      if (result.total === 0 && result.errors.length > 0) {
        toast.error(result.errors[0])
      } else {
        toast.success(`导入完成：${result.success} 本成功${result.failed > 0 ? `，${result.failed} 本失败` : ''}`)
      }
    } catch {
      toast.error('导入失败，请检查文件格式')
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-serif font-semibold tracking-wide">设置</h1>

      <Card className="rounded-xl border-border/50">
        <CardHeader>
          <CardTitle className="text-base">外观</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <Label>深色模式</Label>
          <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
        </CardContent>
      </Card>

      <Card className="rounded-xl border-border/50">
        <CardHeader>
          <CardTitle className="text-base">数据管理</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start rounded-full"
            onClick={() => {
              exportAllData().then(
                () => toast.success('数据导出成功'),
                () => toast.error('导出失败，请重试'),
              )
            }}
          >
            导出数据
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={(e) => { void handleImport(e); }}
          />
          <Button
            variant="outline"
            className="w-full justify-start rounded-full"
            disabled={importing}
            onClick={() => fileInputRef.current?.click()}
          >
            {importing ? '导入中...' : '导入数据'}
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-border/50">
        <CardHeader>
          <CardTitle className="text-base">账户</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full justify-start rounded-full"
            onClick={handleLogout}
          >
            退出登录
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base text-destructive">危险区域</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            注销账户后，您的所有数据（书籍、标签、摘录等）将被永久删除且无法恢复。
          </p>
          <AlertDialog>
            <AlertDialogTrigger className="inline-flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-sm font-medium h-10 px-5 hover:bg-destructive/90 transition-colors disabled:opacity-50">
              {deleting ? '注销中...' : '注销账户'}
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle>确认注销账户？</AlertDialogTitle>
                <AlertDialogDescription>
                  此操作不可撤销。您的所有书籍、标签、摘录和个人数据将被永久删除。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-full">取消</AlertDialogCancel>
                <AlertDialogAction variant="destructive" className="rounded-full" onClick={() => deleteAccount()} disabled={deleting}>
                  {deleting ? '注销中...' : '确认注销'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      <Separator />

      <div className="text-center">
        <p className="text-xs text-muted-foreground mb-2">版本 1.0.0</p>
        <p className="text-xs text-muted-foreground">
          图书数据来源：Google Books / OpenLibrary
        </p>
      </div>
    </div>
  )
}
