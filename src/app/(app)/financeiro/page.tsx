'use client'
import { useEffect, useState } from 'react'

// ── Payment status types ──────────────────────────────────────────────────────
interface PaymentMatch {
  date: string
  amount: number
  label: string
  category: string
}

interface PaymentEntry {
  id: string
  name: string
  value: number
  paymentDate: string | null
  realized: boolean
  linkedProjectNames: string[]
  status: 'confirmado' | 'nao_encontrado' | 'sem_data'
  match: PaymentMatch | null
}

interface PaymentData {
  total: number
  confirmados: number
  pendentes: number
  semData: number
  entries: PaymentEntry[]
}

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

// ── Smooth bezier path helper ─────────────────────────────────────────────────
function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return ''
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]
    const [x1, y1] = pts[i]
    const cx = (x0 + x1) / 2
    d += ` C${cx.toFixed(1)},${y0.toFixed(1)} ${cx.toFixed(1)},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`
  }
  return d
}

// ── Evolution chart — premium redesign ───────────────────────────────────────
function EvolutionChart({ data }: { data: MonthlyPoint[] }) {
  if (!data.length) return null

  const W = 700, H = 110
  const PAD = { top: 12, bottom: 24, left: 52, right: 16 }
  const inner = { w: W - PAD.left - PAD.right, h: H - PAD.top - PAD.bottom }

  const allVals = data.flatMap((d) => [d.credits, d.debits])
  const maxVal  = Math.max(...allVals, 1) * 1.08

  const xp = (i: number) => PAD.left + (i / (data.length - 1 || 1)) * inner.w
  const yp = (v: number) => PAD.top + inner.h - (v / maxVal) * inner.h
  const baseline = PAD.top + inner.h

  const creditPts  = data.map((d, i): [number, number] => [xp(i), yp(d.credits)])
  const debitPts   = data.map((d, i): [number, number] => [xp(i), yp(d.debits)])
  const creditPath = smoothPath(creditPts)
  const debitPath  = smoothPath(debitPts)

  // Area fill paths (close to baseline)
  const creditArea = creditPath + ` L${xp(data.length-1).toFixed(1)},${baseline} L${PAD.left},${baseline} Z`
  const debitArea  = debitPath  + ` L${xp(data.length-1).toFixed(1)},${baseline} L${PAD.left},${baseline} Z`

  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(v)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="gd" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#F43F5E" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Subtle grid */}
      {[0.33, 0.66, 1].map((f) => (
        <line key={f}
          x1={PAD.left} x2={W - PAD.right}
          y1={PAD.top + inner.h * (1 - f)} y2={PAD.top + inner.h * (1 - f)}
          stroke="var(--bd)" strokeWidth={0.4} strokeDasharray="4 4" strokeOpacity={0.6} />
      ))}

      {/* Y labels */}
      {[0.33, 0.66, 1].map((f) => (
        <text key={f} x={PAD.left - 5} y={PAD.top + inner.h * (1 - f) + 3.5}
          textAnchor="end" fill="var(--tx3)" fontSize={8} opacity={0.7}>
          {fmt(maxVal * f)}
        </text>
      ))}

      {/* Area fills */}
      <path d={debitArea}  fill="url(#gd)" />
      <path d={creditArea} fill="url(#gc)" />

      {/* Stroke lines */}
      <path d={debitPath}  fill="none" stroke="#F43F5E" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <path d={creditPath} fill="none" stroke="#10B981" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />

      {/* Dots + month labels */}
      {data.map((d, i) => {
        const cx = xp(i), cyCr = yp(d.credits), cyDb = yp(d.debits)
        const netPos = d.net >= 0
        return (
          <g key={i}>
            {/* month label */}
            <text x={cx} y={H - 4} textAnchor="middle" fill="var(--tx3)" fontSize={8.5} opacity={0.75}>
              {d.month}
            </text>
            {/* net indicator dot at baseline */}
            <circle cx={cx} cy={baseline - 1} r={2.5}
              fill={netPos ? '#10B981' : '#F43F5E'} opacity={0.6} />
            {/* line dots */}
            <circle cx={cx} cy={cyCr} r={2.5} fill="#10B981" stroke="var(--bg3)" strokeWidth={1} />
            <circle cx={cx} cy={cyDb} r={2.5} fill="#F43F5E" stroke="var(--bg3)" strokeWidth={1} />
          </g>
        )
      })}
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

// ── Payment status section ────────────────────────────────────────────────────
function PaymentStatusSection({ selectedPeriod }: { selectedPeriod: string }) {
  const [data, setData]       = useState<PaymentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch('/api/financeiro/pagamentos')
      .then((r) => r.json())
      .then((d: PaymentData) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // Filter to entries whose paymentDate falls in selected period month
  // e.g. selectedPeriod = "Jul/2026" → filter 2026-07-xx
  const periodMonthISO = (() => {
    if (!selectedPeriod) return null
    const [mon, year] = selectedPeriod.split('/')
    const monthMap: Record<string, string> = {
      Jan:'01', Fev:'02', Mar:'03', Abr:'04', Mai:'05', Jun:'06',
      Jul:'07', Ago:'08', Set:'09', Out:'10', Nov:'11', Dez:'12',
    }
    return `${year}-${monthMap[mon] ?? '07'}`
  })()

  const periodEntries = data?.entries.filter((e) =>
    e.paymentDate ? e.paymentDate.startsWith(periodMonthISO ?? '') : false
  ) ?? []

  const displayed = showAll ? periodEntries : periodEntries.slice(0, 8)

  if (loading) {
    return (
      <div className="bg-[var(--bg3)] border border-[var(--bd)] p-6 mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--tx3)]">Status de Pagamentos · {selectedPeriod}</p>
        <p className="text-xs text-[var(--tx3)] mt-4">Cruzando Notion com extrato Nubank...</p>
      </div>
    )
  }

  if (!data || periodEntries.length === 0) {
    return (
      <div className="bg-[var(--bg3)] border border-[var(--bd)] p-6 mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--tx3)]">Status de Pagamentos · {selectedPeriod}</p>
        <p className="text-xs text-[var(--tx3)] mt-4">Nenhum lançamento com data de pagamento em {selectedPeriod} no Notion.</p>
      </div>
    )
  }

  const confirmed    = periodEntries.filter((e) => e.status === 'confirmado').length
  const notFound     = periodEntries.filter((e) => e.status === 'nao_encontrado').length

  return (
    <div className="bg-[var(--bg3)] border border-[var(--bd)] mb-6">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--bd)] flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--tx3)]">
            Status de Pagamentos · {selectedPeriod}
          </p>
          <p className="text-xs text-[var(--tx3)] mt-0.5">Cruzamento Notion × Extrato Nubank</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-[#10B981] font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#10B981]" />
            {confirmed} confirmado{confirmed !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1.5 text-[var(--tx3)]">
            <span className="w-2 h-2 rounded-full bg-[var(--bd)]" />
            {notFound} pendente{notFound !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Entries */}
      <div className="divide-y divide-[var(--bd)]">
        {displayed.map((entry) => (
          <div key={entry.id} className="flex items-start justify-between px-6 py-3 hover:bg-[var(--bg4)] transition-colors gap-4">
            <div className="flex items-start gap-3 min-w-0">
              {/* Status dot */}
              <div className="mt-1 shrink-0">
                {entry.status === 'confirmado' ? (
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#10B981]/15 text-[#10B981] text-[10px] font-bold">✓</span>
                ) : (
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[var(--bg4)] border border-[var(--bd)] text-[var(--tx3)] text-[10px]">?</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm text-[var(--tx)] font-medium truncate">{entry.name}</p>
                {entry.linkedProjectNames.length > 0 && (
                  <p className="text-[10px] text-[var(--tx3)] truncate">{entry.linkedProjectNames.join(', ')}</p>
                )}
                {entry.status === 'confirmado' && entry.match && (
                  <p className="text-[10px] text-[#10B981] mt-0.5">
                    Encontrado em {entry.match.date.split('-').reverse().join('/')} via {entry.match.label}
                  </p>
                )}
                {entry.status === 'nao_encontrado' && (
                  <p className="text-[10px] text-[var(--tx3)] mt-0.5">
                    Esperado em {entry.paymentDate ? entry.paymentDate.split('-').reverse().join('/') : '—'} · sem correspondência no extrato
                  </p>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold" style={{ color: entry.status === 'confirmado' ? '#10B981' : 'var(--tx2)' }}>
                {fmtBRL(entry.value)}
              </p>
              {entry.status === 'confirmado' && entry.match && Math.abs(entry.match.amount - entry.value) > 0.01 && (
                <p className="text-[10px] text-[var(--tx3)]">recebido {fmtBRL(entry.match.amount)}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {periodEntries.length > 8 && (
        <div className="px-6 py-3 border-t border-[var(--bd)]">
          <button onClick={() => setShowAll((v) => !v)} className="text-xs text-[var(--tx3)] hover:text-[var(--tx)] transition-colors">
            {showAll ? 'Mostrar menos' : `Ver mais ${periodEntries.length - 8} lançamentos`}
          </button>
        </div>
      )}
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
        <div className="bg-[var(--bg3)] border border-[var(--bd)] mb-6 px-5 pt-4 pb-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--tx3)]">Evolução mensal · Conta Corrente</p>
            <div className="flex items-center gap-4 text-[10px] text-[var(--tx3)]">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-px bg-[#10B981] inline-block rounded" />Entradas</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-px bg-[#F43F5E] inline-block rounded" />Saídas</span>
            </div>
          </div>
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

      {/* Payment status — Notion × Nubank cross-reference */}
      <PaymentStatusSection selectedPeriod={selectedPeriod} />

      {/* Account cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-px border border-[var(--bd)]">
        {data.accounts.map((acc) => (
          <AccountCard key={acc.id} account={acc} activePeriod={selectedPeriod} />
        ))}
      </div>
    </main>
  )
}
