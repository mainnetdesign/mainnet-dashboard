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

interface Account {
  id: string
  name: string
  bank: string
  cnpj: string
  period: string
  totalCredits: number
  totalDebits: number
  net: number
  transactions: Transaction[]
}

interface Cache {
  lastUpdated: string
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
  'Outros':                    '#6B7280',
}

function AccountCard({ account }: { account: Account }) {
  const [filter, setFilter] = useState<'todos' | 'CREDITO' | 'DEBITO'>('todos')
  const [search, setSearch] = useState('')

  const txns = account.transactions.filter((t) => {
    if (filter !== 'todos' && t.type !== filter) return false
    if (search && !t.label.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const isEmpty = account.transactions.length === 0

  return (
    <div className="bg-[var(--bg3)] border border-[var(--bd)]">
      {/* Account header */}
      <div className="px-6 py-5 border-b border-[var(--bd)]">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--tx3)]">{account.bank}</p>
            <h2 className="text-base font-black text-[var(--tx)] mt-0.5">{account.name}</h2>
            <p className="text-xs text-[var(--tx3)]">{account.cnpj} · {account.period}</p>
          </div>
          {!isEmpty && (
            <div className="text-right">
              <p className="text-[10px] text-[var(--tx3)] uppercase tracking-widest">Resultado</p>
              <p className="text-xl font-black" style={{ color: account.net >= 0 ? '#10B981' : '#EF4444' }}>
                {fmtBRL(account.net)}
              </p>
            </div>
          )}
        </div>

        {!isEmpty && (
          <div className="grid grid-cols-2 gap-px border border-[var(--bd)] mt-4">
            <div className="bg-[var(--bg4)] px-4 py-3">
              <p className="text-[10px] text-[var(--tx3)] uppercase tracking-widest">Entradas</p>
              <p className="text-lg font-black text-[#10B981]">{fmtBRL(account.totalCredits)}</p>
            </div>
            <div className="bg-[var(--bg4)] px-4 py-3">
              <p className="text-[10px] text-[var(--tx3)] uppercase tracking-widest">Saídas</p>
              <p className="text-lg font-black text-[var(--tx)]">{fmtBRL(account.totalDebits)}</p>
            </div>
          </div>
        )}
      </div>

      {isEmpty ? (
        <div className="px-6 py-10 text-center">
          <p className="text-sm text-[var(--tx3)]">Sem movimentação em {account.period}</p>
          <p className="text-xs text-[var(--tx3)] mt-1">Envie o extrato CSV para atualizar</p>
        </div>
      ) : (
        <>
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
            <span className="text-[10px] text-[var(--tx3)] ml-auto">{txns.length} de {account.transactions.length}</span>
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
        </>
      )}
    </div>
  )
}

export default function FinanceiroPage() {
  const [data, setData] = useState<Cache | null>(null)

  useEffect(() => {
    fetch('/api/financeiro').then((r) => r.json()).then(setData)
  }, [])

  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <p className="text-sm text-[var(--tx3)]">Carregando dados financeiros...</p>
      </div>
    )
  }

  const totalCredits = data.accounts.reduce((s, a) => s + a.totalCredits, 0)
  const totalDebits  = data.accounts.reduce((s, a) => s + a.totalDebits, 0)
  const totalNet     = totalCredits - totalDebits

  const updatedAt = new Date(data.lastUpdated).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })

  // Category breakdown across all accounts
  const catMap: Record<string, { total: number; type: 'in' | 'out' }> = {}
  for (const acc of data.accounts) {
    for (const t of acc.transactions) {
      if (!catMap[t.category]) catMap[t.category] = { total: 0, type: t.type === 'CREDITO' ? 'in' : 'out' }
      catMap[t.category].total += t.amount
    }
  }

  return (
    <main className="flex-1 bg-[var(--bg)] min-h-screen p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-[var(--tx)] tracking-tight">Financeiro</h1>
          <p className="text-xs text-[var(--tx3)] mt-1">Mainnet Design LTDA · Nubank Empresarial · {data.accounts[0]?.period}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-[var(--tx3)] uppercase tracking-widest">Extrato importado em</p>
          <p className="text-xs font-medium text-[var(--tx2)]">{updatedAt}</p>
        </div>
      </div>

      {/* Consolidated KPIs */}
      <div className="grid grid-cols-3 gap-px border border-[var(--bd)] mb-8">
        {[
          { label: 'Total Entradas', value: fmtBRL(totalCredits), color: '#10B981', sub: 'todas as contas' },
          { label: 'Total Saídas',   value: fmtBRL(totalDebits),  color: 'var(--tx)', sub: 'todas as contas' },
          { label: 'Resultado',      value: fmtBRL(totalNet),     color: totalNet >= 0 ? '#10B981' : '#EF4444', sub: 'entradas − saídas' },
        ].map((k) => (
          <div key={k.label} className="bg-[var(--bg3)] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--tx3)] mb-2">{k.label}</p>
            <p className="text-2xl font-black leading-none" style={{ color: k.color }}>{k.value}</p>
            <p className="text-xs text-[var(--tx3)] mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Category breakdown */}
      <div className="bg-[var(--bg3)] border border-[var(--bd)] mb-8 p-6">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--tx3)] mb-4">Breakdown por categoria</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.entries(catMap)
            .sort((a, b) => b[1].total - a[1].total)
            .map(([cat, { total, type }]) => (
              <div key={cat} className="flex items-center justify-between border border-[var(--bd)] px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: CATEGORY_COLORS[cat] ?? '#6B7280' }} />
                  <p className="text-xs text-[var(--tx)]">{cat}</p>
                </div>
                <p className="text-xs font-semibold ml-2 shrink-0" style={{ color: type === 'in' ? '#10B981' : 'var(--tx)' }}>
                  {type === 'in' ? '+' : '-'}{fmtBRL(total)}
                </p>
              </div>
            ))}
        </div>
      </div>

      {/* Two account cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-px border border-[var(--bd)]">
        {data.accounts.map((acc) => (
          <AccountCard key={acc.id} account={acc} />
        ))}
      </div>
    </main>
  )
}
