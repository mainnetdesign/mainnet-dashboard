import { NextResponse } from 'next/server'
import { fetchAllTransactions } from '@/lib/notion'
import cache from '@/config/nubank-cache.json'

export const dynamic = 'force-dynamic'

// ── Status taxonomy ───────────────────────────────────────────────────────────
// confirmado            → found in bank + Notion Realizado=true   ✅ all good
// recebido_desatualizado→ found in bank + Realizado=false         ⚠️ update Notion
// divergente            → Realizado=true + month covered + NOT found ↔ discrepancy
// sem_extrato           → Realizado=true + month NOT covered      ◯ can't verify
// pendente              → Realizado=false + month covered + NOT found ⏳ unpaid
// aguardando            → paymentDate in future / no extrato yet  🕐 not due yet
// sem_data              → no paymentDate at all                   — unscheduled

type PaymentStatus =
  | 'confirmado'
  | 'recebido_desatualizado'
  | 'divergente'
  | 'sem_extrato'
  | 'pendente'
  | 'aguardando'
  | 'sem_data'

interface NubankTx {
  date: string
  amount: number
  label: string
  category: string
}

// Build set of months covered by bank extracts
function coveredMonths(): Set<string> {
  const months = new Set<string>()
  for (const acc of cache.accounts) {
    for (const period of acc.periods) {
      // period has transactions — derive month from first txn date
      if (period.transactions.length > 0) {
        months.add(period.transactions[0].date.slice(0, 7))
      }
    }
  }
  return months
}

function allCreditTxns(): NubankTx[] {
  const txns: NubankTx[] = []
  for (const acc of cache.accounts) {
    for (const period of acc.periods) {
      for (const t of period.transactions) {
        if (t.type === 'CREDITO') {
          txns.push({ date: t.date, amount: t.amount, label: t.label, category: t.category })
        }
      }
    }
  }
  return txns
}

function dateDiffDays(a: string, b: string): number {
  return Math.abs((new Date(a).getTime() - new Date(b).getTime()) / 86_400_000)
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function GET() {
  const [notionEntries, credits, covered] = await Promise.all([
    fetchAllTransactions(),
    Promise.resolve(allCreditTxns()),
    Promise.resolve(coveredMonths()),
  ])

  const todayStr = today()

  const results = notionEntries
    .filter((e) => e.value > 0)
    .map((entry) => {
      const refDate = entry.paymentDate
      const entryMonth = refDate ? refDate.slice(0, 7) : null
      const monthCovered = entryMonth ? covered.has(entryMonth) : false
      const isFuture = refDate ? refDate > todayStr : false

      // Match: value within 8% (exchange rate variance), date within 12 days
      const candidates = credits
        .filter((tx) => {
          const valueDiff = Math.abs(tx.amount - entry.value) / entry.value
          if (valueDiff > 0.08) return false
          if (refDate && dateDiffDays(tx.date, refDate) > 12) return false
          return true
        })
        .sort((a, b) => Math.abs(a.amount - entry.value) - Math.abs(b.amount - entry.value))

      const bestMatch = candidates[0] ?? null
      const valueDiffPct = bestMatch
        ? Math.round(Math.abs(bestMatch.amount - entry.value) / entry.value * 100 * 10) / 10
        : null

      // ── Classify ──────────────────────────────────────────────────────────
      let status: PaymentStatus

      if (!refDate) {
        status = bestMatch ? 'confirmado' : 'sem_data'
      } else if (bestMatch) {
        // Found in bank extrato
        status = entry.realized ? 'confirmado' : 'recebido_desatualizado'
      } else {
        // Not found in extrato
        if (isFuture || !monthCovered) {
          status = entry.realized ? 'sem_extrato' : 'aguardando'
        } else {
          // Month covered but not found → real discrepancy
          status = entry.realized ? 'divergente' : 'pendente'
        }
      }

      return {
        id: entry.id,
        name: entry.name,
        value: entry.value,
        paymentDate: refDate,
        realized: entry.realized,
        linkedProjectNames: entry.linkedProjectNames,
        monthCovered,
        status,
        match: bestMatch
          ? {
              date: bestMatch.date,
              amount: bestMatch.amount,
              label: bestMatch.label,
              category: bestMatch.category,
              valueDiffPct,
            }
          : null,
      }
    })

  // Summary counts
  const count = (s: PaymentStatus) => results.filter((r) => r.status === s).length

  return NextResponse.json({
    total: results.length,
    confirmados:           count('confirmado'),
    recebidoDesatualizado: count('recebido_desatualizado'),
    divergentes:           count('divergente'),
    semExtrato:            count('sem_extrato'),
    pendentes:             count('pendente'),
    aguardando:            count('aguardando'),
    semData:               count('sem_data'),
    entries: results,
  })
}
