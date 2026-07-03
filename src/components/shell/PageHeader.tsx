type PageHeaderProps = {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className="shrink-0 border-b border-stroke-soft-200 bg-bg-white-0 px-5 pb-3.5 pt-5">
      <div className="flex items-center justify-between gap-4 pl-1.5">
        <div className="min-w-0">
          <h1 className="text-label-lg tracking-tight text-text-strong-950">{title}</h1>
          {subtitle && (
            <p className="mt-0.5 text-paragraph-xs text-text-sub-600">{subtitle}</p>
          )}
        </div>
        {actions}
      </div>
    </header>
  )
}
