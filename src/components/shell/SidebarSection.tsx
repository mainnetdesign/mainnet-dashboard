type SidebarSectionProps = {
  title: string
  children: React.ReactNode
  className?: string
}

export default function SidebarSection({ title, children, className }: SidebarSectionProps) {
  return (
    <div
      className={`flex flex-col gap-2 border-b border-stroke-soft-200 px-3.5 pb-3.5 pt-5 ${className ?? ''}`}
    >
      <p className="px-1.5 text-label-xs text-text-soft-400">{title}</p>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  )
}
