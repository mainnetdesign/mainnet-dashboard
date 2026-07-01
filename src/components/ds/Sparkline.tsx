'use client'

import { Line, LineChart, ResponsiveContainer } from 'recharts'
import { cn } from '@/utils/cn'

type SparklineProps = {
  data: number[]
  color?: string
  height?: number
  className?: string
  showGrid?: boolean
  labels?: string[]
}

export default function Sparkline({
  data,
  color = '#335cff',
  height = 64,
  className,
  showGrid = false,
  labels,
}: SparklineProps) {
  const chartData = data.map((value, index) => ({
    index,
    value,
    label: labels?.[index],
  }))

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
          {showGrid && (
            <defs>
              <pattern id="sparkGrid" width="20%" height="100%" patternUnits="objectBoundingBox">
                <line x1="0" y1="0" x2="0" y2="100%" stroke="var(--color-stroke-soft-200)" strokeWidth="1" strokeDasharray="2 2" />
              </pattern>
            </defs>
          )}
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
