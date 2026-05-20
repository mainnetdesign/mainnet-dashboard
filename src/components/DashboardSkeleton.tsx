'use client'
import React from 'react'

function Bone({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`bg-[#1A1A1A] animate-pulse ${className ?? ''}`} style={style} />
  )
}

function CardSkeleton() {
  return (
    <div className="bg-[#111111] p-5 border border-[#222222]">
      <Bone className="h-3 w-24 mb-3" />
      <Bone className="h-8 w-32 mb-2" />
      <Bone className="h-3 w-40" />
    </div>
  )
}

function ChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div className="bg-[#111111] p-6 border border-[#222222]">
      <Bone className="h-4 w-40 mb-2" />
      <Bone className="h-3 w-64 mb-6" />
      <div className="flex items-end gap-2" style={{ height }}>
        {Array.from({ length: 13 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-[#1A1A1A] animate-pulse"
            style={{ height: `${30 + Math.random() * 70}%`, animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="bg-[#111111] border border-[#222222]">
      <div className="p-6 pb-4">
        <Bone className="h-4 w-48 mb-2" />
        <Bone className="h-3 w-72 mb-5" />
        <div className="flex gap-2">
          <Bone className="h-7 w-16" />
          <Bone className="h-7 w-14" />
          <Bone className="h-7 w-20" />
          <Bone className="h-7 w-24" />
        </div>
      </div>
      <div className="divide-y divide-[#222222]">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-4">
            <Bone className="h-4 flex-1" style={{ animationDelay: `${i * 40}ms` }} />
            <Bone className="h-4 w-12" style={{ animationDelay: `${i * 40 + 20}ms` }} />
            <Bone className="h-4 w-20" style={{ animationDelay: `${i * 40 + 40}ms` }} />
            <Bone className="h-4 w-20" style={{ animationDelay: `${i * 40 + 60}ms` }} />
            <Bone className="h-4 w-24" style={{ animationDelay: `${i * 40 + 80}ms` }} />
            <Bone className="h-4 w-12" style={{ animationDelay: `${i * 40 + 100}ms` }} />
            <Bone className="h-6 w-16" style={{ animationDelay: `${i * 40 + 120}ms` }} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DashboardSkeleton() {
  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px mb-8 border border-[#222222]">
        {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-px mb-8 border border-[#222222]">
        {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
      <div className="bg-[#111111] p-5 border border-[#222222] mb-8">
        <div className="flex items-center gap-3">
          <Bone className="h-4 w-36" />
          <Bone className="h-5 w-6" />
        </div>
      </div>
      <ChartSkeleton height={280} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-px mb-8 mt-8 border border-[#222222]">
        <div className="lg:col-span-2"><ChartSkeleton height={320} /></div>
        <div className="bg-[#111111] p-6 border border-[#222222]">
          <Bone className="h-4 w-36 mb-2" />
          <Bone className="h-3 w-48 mb-6" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="mb-4">
              <div className="flex justify-between mb-1"><Bone className="h-3 w-20" /><Bone className="h-3 w-16" /></div>
              <Bone className="h-2 w-full" />
            </div>
          ))}
        </div>
      </div>
      <ChartSkeleton height={260} />
      <div className="mt-8"><TableSkeleton /></div>
    </div>
  )
}
