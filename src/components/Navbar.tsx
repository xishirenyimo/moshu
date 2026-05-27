import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Search, Plus, Settings, LogOut, User, Library, PenLine } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useFilterStore } from '@/stores/filterStore'
import { useState, useRef } from 'react'

export function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const storeDisplayName = useAuthStore((s) => s.displayName)
  const displayName = storeDisplayName
    || (user?.user_metadata?.display_name as string)
    || (user?.user_metadata?.displayName as string)
    || user?.email?.split('@')[0]
    || '用户'
  const setSearch = useFilterStore((s) => s.setSearch)
  const search = useFilterStore((s) => s.search)
  const [searchInput, setSearchInput] = useState(search)
  const timerRef = useRef<number | null>(null)

  const handleLogout = async () => {
    useAuthStore.getState().setUser(null)
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  const handleSearchChange = (value: string) => {
    setSearchInput(value)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setSearch(value), 300)
  }

  const isActive = (path: string) => {
    if (path === '/books') return location.pathname.startsWith('/books')
    if (path === '/settings') return location.pathname.startsWith('/settings')
    return false
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-md hidden md:block">
        <div className="container mx-auto max-w-6xl flex items-center justify-between h-14 px-4 gap-6">
          <Link to="/books" className="font-serif font-bold text-xl tracking-wide shrink-0 hover:opacity-80 transition-opacity">
            墨属
          </Link>
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索书名、作者..."
              value={searchInput}
              className="pl-9 h-9"
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/books/add')}>
            <Plus className="h-4 w-4 mr-1.5" /> 添加书籍
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate('/settings/authors')}>
            作者管理
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors border">
              <User className="h-4 w-4" />
              <span className="max-w-[100px] truncate">{displayName || '用户'}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="h-4 w-4 mr-2" /> 设置
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" /> 退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/80 backdrop-blur-md md:hidden safe-bottom">
        <div className="flex items-center justify-around h-16">
          <button
            type="button"
            onClick={() => navigate('/books')}
            className={`flex flex-col items-center justify-center gap-0.5 h-full px-4 min-w-0 text-xs font-medium transition-colors ${
              isActive('/books')
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Library className="h-5 w-5" />
            <span>书架</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/books/add')}
            className={`flex flex-col items-center justify-center gap-0.5 h-full px-4 min-w-0 text-xs font-medium transition-colors ${
              isActive('/books/add')
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <PenLine className="h-5 w-5" />
            <span>录入</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className={`flex flex-col items-center justify-center gap-0.5 h-full px-4 min-w-0 text-xs font-medium transition-colors ${
              isActive('/settings')
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Settings className="h-5 w-5" />
            <span>设置</span>
          </button>
        </div>
      </nav>
    </>
  )
}
