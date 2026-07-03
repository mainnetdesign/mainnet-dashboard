import Link from 'next/link'
import { RiArrowRightUpLine } from '@remixicon/react'
import Sparkline from '@/components/ds/Sparkline'
import Badge from '@/components/ds/Badge'
import WidgetCard from '@/components/ds/WidgetCard'
import type { Insta2FigmaService } from '@/types/insta2figma'
import { fmtUSD, I2F_BASE } from '@/lib/insta2figma/constants'
import Insta2FigmaIcon from '@/components/store/Insta2FigmaIcon'

export default function ServiceCard({ service }: { service: Insta2FigmaService }) {
  return (
    <Link href={`${I2F_BASE}/overview`}>
      <WidgetCard className="group transition-colors hover:border-stroke-sub-300">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Insta2FigmaIcon size={40} className="rounded-xl" />
            <div>
              <p className="text-label-md text-text-strong-950">{service.name}</p>
              <p className="text-paragraph-xs text-text-soft-400">{service.url.replace('https://', '')}</p>
            </div>
          </div>
          <Badge variant={service.status === 'active' ? 'success' : 'neutral'}>
            {service.status === 'active' ? 'Ativo' : service.status}
          </Badge>
        </div>

        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-paragraph-xs text-text-soft-400">MRR</p>
            <p className="font-display text-title-h5 text-text-strong-950">{fmtUSD(service.mrrUSD)}</p>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant={service.mrrDeltaPct >= 0 ? 'success' : 'error'}>
                {service.mrrDeltaPct >= 0 ? '+' : ''}{service.mrrDeltaPct}%
              </Badge>
              <span className="text-label-xs text-text-soft-400">{service.users} usuários</span>
            </div>
          </div>
          <Sparkline data={service.earningsSparkline} height={48} className="w-28" />
        </div>

        <div className="flex items-center gap-1 text-label-sm text-text-sub-600 group-hover:text-text-strong-950">
          Abrir produto
          <RiArrowRightUpLine className="size-4" />
        </div>
      </WidgetCard>
    </Link>
  )
}
