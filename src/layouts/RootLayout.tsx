import { AnimatedOutlet } from '@/components/PageTransition'

export default function RootLayout() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <AnimatedOutlet />
    </div>
  )
}
