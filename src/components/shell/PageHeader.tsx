type PageHeaderProps = {
  title: string
  actions?: React.ReactNode
}

export default function PageHeader({ title, actions }: PageHeaderProps) {
  return (
    <header className="shrink-0 border-b border-stroke-soft-200 bg-bg-white-0 px-5 pb-3.5 pt-5">
      <div className="flex items-center justify-between pl-1.5">
        <h1 className="text-label-lg tracking-tight text-text-strong-950">{title}</h1>
        {actions}
      </div>
    </header>
  )
}
