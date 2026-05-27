import { Navbar } from '@/components/Navbar'
import { AnimatedOutlet } from '@/components/PageTransition'

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto max-w-6xl px-4 pb-24 md:pb-12 pt-4 md:pt-20">
        <AnimatedOutlet />
      </main>
    </div>
  )
}
