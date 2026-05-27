import { useLocation, Outlet } from 'react-router-dom'
import { type ReactNode } from 'react'

function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation()
  return (
    <div key={location.pathname} className="animate-page-enter">
      {children}
    </div>
  )
}

export function AnimatedOutlet() {
  const location = useLocation()
  return (
    <div key={location.pathname} className="animate-page-enter">
      <Outlet />
    </div>
  )
}

export default PageTransition
