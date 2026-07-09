'use client'

import { cn } from '@/utils/cn'

function Bone({ className }: { className?: string }) {
  return <div className={cn('mn-shimmer rounded-2xl', className)} />
}

export default function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Bone key={i} className="h-44" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Bone key={i} className="h-36" />
        ))}
      </div>
      <Bone className="h-64" />
      <Bone className="h-80" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Bone className="h-96 lg:col-span-2" />
        <Bone className="h-96" />
      </div>
      <Bone className="h-72" />
      <Bone className="h-96" />
    </div>
  )
}
