import Sidebar from '@/components/Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      {/* Content — needs top padding on mobile to clear the fixed top bar */}
      <div className="flex-1 min-w-0 lg:pt-0 pt-14">
        {children}
      </div>
    </div>
  )
}
