'use client'
import { useEffect, useState } from 'react'

interface Transaction {
  id: string
  date: string
  label: string
  category: string
  type: 'CREDITO' | 'DEBITO'
  amount: number
}

interface Period {
  period: string
  totalCredits: number
  totalDebits: number
  net: number
  transactions: Transaction[]
}

interface Account {
  id: string
  name: string
  bank: string
  cnpj: string
  periods: Period[]
}

interface MonthlyPoint {
  month: string
  credits: number
  debits: number
  net: number
}

interface Cache {
  lastUpdated: string
  monthly: MonthlyPoint[]
  accounts: Account[]
}

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function fmtDate(iso: string) {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

const CATEGORY_COLORS: Record<string, string> = {
  'Recebimento Internacional': '#10B981',
  'Crédito em Conta':          '#34D399',
  'PIX Recebido':              '#6EE7B7',
  'Reembolso':                 '#A7F3D0',
  'PIX Enviado':               '#6366F1',
  'Boleto':                    '#EF4444',
  'Benefícios':                '#F59E0B',
  'Contabilidade':             '#8B5CF6',
  'Impostos':                  '#EC4899',
  'Empréstimo':                '#F97316',
  'Compra':                    '#94A3B8',
  'Utilidades':                '#60A5FA',
  'Débito em Conta':           '#94A3B8',
  'Outros':                    '#6B7280',
}

// ── Evolution chart (pure SVG, no deps) ──────────────────────────────────────
function EvolutionChart({ data }: { data: MonthlyPoint[] }) {
  if (!data.length) return null

  const W = 700, H = 160, PAD = { top: 16, bottom: 32, left: 64, right: 16 }
  const inner = { w: W - PAD.left - PAD.right, h: H - PAD.top - PAD.bottom }

  const allVals = data.flatMap((d) => [d.credits, d.debits, Math.abs(d.net)])
  const maxVal  = Math.max(...allVals, 1)

  const x = (i: number) => PAD.left + (i / (data.length - 1 || 1)) * inner.w
  const y = (v: number) => PAD.top + inner.h - (v / maxVal) * inner.h

  const line = (key: 'credits' | 'debits') =>
    data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {/* Grid lines */}
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1={PAD.left} x2={W - PAD.right} y1={PAD.top + inner.h * (1 - f)} y2={PAD.top + inner.h * (1 - f)}
          stroke="var(--bd)" strokeWidth={0.5} strokeDasharray="3 3" />
      ))}

      {/* Y labels */}
      {[0, 0.5, 1].map((f) => (
        <text key={f} x={PAD.left - 6} y={PAD.top + inner.h * (1 - f) + 4} textAnchor="end"
          className="fill-[var(--tx3)]" fontSize={9}>
          {new Intl.NumberFormat('pt-BR', { notation: 'compact', currency: 'BRL' }).format(maxVal * f)}
        </text>
      ))}

      {/* Entradas line */}
      <path d={line('credits')} fill="none" stroke="#10B981" strokeWidth={2} strokeLinejoin="round" />
      {/* Saídas line */}
      <path d={line('debits')} fill="none" stroke="#EF4444" strokeWidth={2} strokeLinejoin="round" />

      {/* Net bars */}
      {data.map((d, i) => {
        const bw = inner.w / (data.length * 3)
        const bx = x(i) - bw / 2
        const netPos = d.net >= 0
        const bh = (Math.abs(d.net) / maxVal) * inner.h
        const by = netPos ? y(d.net) : PAD.top + inner.h
        return (
          <rect key={i} x={bx} y={by} width={bw} height={bh}
            fill={netPos ? '#10B981' : '#EF4444'} fillOpacity={0.25} />
        )
      })}

      {/* Dots + labels */}
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(d.credits)} r={3} fill="#10B981" />
          <circle cx={x(i)} cy={y(d.debits)} r={3} fill="#EF4444" />
          <text x={x(i)} y={H - 6} textAnchor="middle" className="fill-[var(--tx3)]" fontSize={10}>
            {d.month}
          </text>
        </g>
      ))}

      {/* Legend */}
      <g transform={`translate(${PAD.left}, ${PAD.top - 2})`}>
        <circle cx={0} cy={0} r={3} fill="#10B981" />
        <text x={6} y={4} className="fill-[var(--tx3)]" fontSize={8}>Entradas</text>
        <circle cx={60} cy={0} r={3} fill="#EF4444" />
        <text x={66} y={4} className="fill-[var(--tx3)]" fontSize={8}>Saídas</text>
        <rect x={115} y={-4} width={8} height={8} fill="#10B981" fillOpacity={0.3} />
        <text x={126} y={4} className="fill-[var(--tx3)]" fontSize={8}>Resultado</text>
      </g>
    </svg>
  )
}

// ── Account card with period selector ────────────────────────────────────────
function AccountCard({ account, activePeriod }: { account: Account; activePeriod: string }) {
  const [filter, setFilter] = useState<'todos' | 'CREDITO' | 'DEBITO'>('todos')
  const [search, setSearch]  = useState('')

  const period = account.periods.find((p) => p.period === activePeriod) ?? account.periods[account.periods.length - 1]

  if (!period) {
    return (
      <div className="bg-[var(--bg3)] border border-[var(--bd)] px-6 py-10 text-center">
        <p className="text-sm text-[var(--tx3)]">{account.name}</p>
        <p className="text-xs text-[var(--tx3)] mt-1">Sem extratos disponíveis · Envie o CSV para atualizar</p>
      </div>
    )
  }

  const txns = period.transactions.filter((t) => {
    if (filter !== 'todos' && t.type !== filter) return false
    if (search && !t.label.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="bg-[var(--bg3)] border border-[var(--bd)]">
      {/* Header */}
      <div className="px-6 py-5 border-b border-[var(--bd)]">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--tx3)]">{account.bank}</p>
            <h2 className="text-base font-black text-[var(--tx)] mt-0.5">{account.name}</h2>
            <p className="text-xs text-[var(--tx3)]">{account.cnpj} · {period.period}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-[var(--tx3)] uppercase tracking-widest">Resultado</p>
            <p className="text-xl font-black" style={{ color: period.net >= 0 ? '#10B981' : '#EF4444' }}>
              {fmtBRL(period.net)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-px border border-[var(--bd)] mt-4">
          <div className="bg-[var(--bg4)] px-4 py-3">
            <p className="text-[10px] text-[var(--tx3)] uppercase tracking-widest">Entradas</p>
            <p className="text-lg font-black text-[#10B981]">{fmtBRL(period.totalCredits)}</p>
          </div>
          <div className="bg-[var(--bg4)] px-4 py-3">
            <p className="text-[10px] text-[var(--tx3)] uppercase tracking-widest">Saídas</p>
            <p className="text-lg font-black text-[var(--tx)]">{fmtBRL(period.totalDebits)}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-[var(--bd)] flex-wrap">
        <input
          type="text"
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-7 px-3 text-xs border border-[var(--bd)] bg-[var(--bg)] text-[var(--tx)] placeholder:text-[var(--tx3)] focus:outline-none focus:border-[var(--bd3)] w-36"
        />
        {(['todos', 'CREDITO', 'DEBITO'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`h-7 px-3 text-xs font-medium border transition-colors ${
              filter === f
                ? 'bg-[var(--inv)] text-[var(--inv-tx)] border-[var(--inv)]'
                : 'border-[var(--bd)] text-[var(--tx3)] hover:border-[var(--bd3)]'
            }`}
          >
            {f === 'todos' ? 'Todos' : f === 'CREDITO' ? 'Entradas' : 'Saídas'}
          </button>
        ))}
        <span className="text-[10px] text-[var(--tx3)] ml-auto">{txns.length} de {period.transactions.length}</span>
      </div>

      {/* Transactions */}
      <div className="divide-y divide-[var(--bd)] max-h-[400px] overflow-y-auto">
        {txns.map((t) => (
          <div key={t.id} className="flex items-center justify-between px-6 py-2.5 hover:bg-[var(--bg4)] transition-colors">
            <div className="flex items-center gap-3">
              <div className="text-[11px] font-medium text-[var(--tx3)] w-9 shrink-0">{fmtDate(t.date)}</div>
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: CATEGORY_COLORS[t.category] ?? '#6B7280' }} />
              <div>
                <p className="text-sm text-[var(--tx)] leading-snug">{t.label}</p>
                <p className="text-[10px] text-[var(--tx3)]">{t.category}</p>
              </div>
            </div>
            <p className="text-sm font-semibold shrink-0 ml-4" style={{ color: t.type === 'CREDITO' ? '#10B981' : 'var(--tx)' }}>
              {t.type === 'CREDITO' ? '+' : '-'}{fmtBRL(t.amount)}
            </p>
          </div>
        ))}
        {txns.length === 0 && (
          <div className="px-6 py-8 text-center text-sm text-[var(--tx3)]">Nenhuma transação encontrada.</div>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function FinanceiroPage() {
  const [data, setData] = useState<Cache | null>(null)
  const [activePeriod, setActivePeriod] = useState<string>('')

  useEffect(() => {
    fetch('/api/financeiro').then((r) => r.json()).then((d: Cache) => {
      setData(d)
      if (d.monthly?.length) setActivePeriod(d.monthly[d.monthly.length - 1].month.replace('/26', '/2026').replace('Mai', 'Mai').replace('Jun', 'Jun').replace('Jul', 'Jul'))
    })
  }, [])

  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <p className="text-sm text-[var(--tx3)]">Carregando dados financeiros...</p>
      </div>
    )
  }

  // Derive available periods from conta-corrente (most complete account)
  const mainAccount = data.accounts.find((a) => a.id === 'conta-corrente')
  const periods = mainAccount?.periods.map((p) => p.period) ?? []

  const selectedPeriod = activePeriod || periods[periods.length - 1] || ''

  const activePeriodData = mainAccount?.periods.find((p) => p.period === selectedPeriod)
  const totalCredits = activePeriodData?.totalCredits ?? 0
  const totalDebits  = activePeriodData?.totalDebits  ?? 0
  const totalNet     = activePeriodData?.net          ?? 0

  const updatedAt = new Date(data.lastUpdated).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })

  // Category breakdown for selected period
  const catMap: Record<string, { total: number; type: 'in' | 'out' }> = {}
  for (const acc of data.accounts) {
    const p = acc.periods.find((x) => x.period === selectedPeriod)
    if (!p) continue
    for (const t of p.transactions) {
      if (!catMap[t.category]) catMap[t.category] = { total: 0, type: t.type === 'CREDITO' ? 'in' : 'out' }
      catMap[t.category].total += t.amount
    }
  }

  return (
    <main className="flex-1 bg-[var(--bg)] min-h-screen p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-[var(--tx)] tracking-tight">Financeiro</h1>
          <p className="text-xs text-[var(--tx3)] mt-1">Mainnet Design LTDA · Nubank Empresarial · {selectedPeriod}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-[var(--tx3)] uppercase tracking-widest">Atualizado em</p>
          <p className="text-xs font-medium text-[var(--tx2)]">{updatedAt}</p>
        </div>
      </div>

      {/* Period selector */}
      {periods.length > 1 && (
        <div className="flex items-center gap-2 mb-6">
          <p className="text-[10px] text-[var(--tx3)] uppercase tracking-widest mr-2">Período</p>
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => setActivePeriod(p)}
              className={`h-8 px-4 text-xs font-semibold border transition-colors ${
                selectedPeriod === p
                  ? 'bg-[var(--inv)] text-[var(--inv-tx)] border-[var(--inv)]'
                  : 'border-[var(--bd)] text-[var(--tx3)] hover:border-[var(--bd3)] bg-[var(--bg3)]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Evolution chart */}
      {data.monthly && data.monthly.length > 1 && (
        <div className="bg-[var(--bg3)] border border-[var(--bd)] mb-6 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--tx3)] mb-3">Evolução mensal · Conta Corrente</p>
          <EvolutionChart data={data.monthly} />
        </div>
      )}

      {/* KPIs for selected period */}
      <div className="grid grid-cols-3 gap-px border border-[var(--bd)] mb-6">
        {[
          { label: 'Entradas', value: fmtBRL(totalCredits), color: '#10B981', sub: selectedPeriod },
          { label: 'Saídas',   value: fmtBRL(totalDebits),  color: 'var(--tx)', sub: selectedPeriod },
          { label: 'Resultado', value: fmtBRL(totalNet),    color: totalNet >= 0 ? '#10B981' : '#EF4444', sub: 'entradas − saídas' },
        ].map((k) => (
          <div key={k.label} className="bg-[var(--bg3)] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--tx3)] mb-2">{k.label}</p>
            <p className="text-2xl font-black leading-none" style={{ color: k.color }}>{k.value}</p>
            <p className="text-xs text-[var(--tx3)] mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Category breakdown */}
      {Object.keys(catMap).length > 0 && (
        <div className="bg-[var(--bg3)] border border-[var(--bd)] mb-6 p-6">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--tx3)] mb-4">Breakdown por categoria · {selectedPeriod}</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(catMap)
              .sort((a, b) => b[1].total - a[1].total)
              .map(([cat, { total, type }]) => (
                <div key={cat} className="flex items-center justify-between border border-[var(--bd)] px-4 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: CATEGORY_COLORS[cat] ?? '#6B7280' }} />
                    <p className="text-xs text-[var(--tx)] truncate">{cat}</p>
                  </div>
                  <p className="text-xs font-semibold ml-2 shrink-0" style={{ color: type === 'in' ? '#10B981' : 'var(--tx)' }}>
                    {type === 'in' ? '+' : '-'}{fmtBRL(total)}
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Account cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-px border border-[var(--bd)]">
        {data.accounts.map((acc) => (
          <AccountCard key={acc.id} account={acc} activePeriod={selectedPeriod} />
        ))}
      </div>
    </main>
  )
}
