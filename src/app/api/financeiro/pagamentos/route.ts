import { NextResponse } from 'next/server'
import { fetchAllTransactions } from '@/lib/notion'
import cache from '@/config/nubank-cache.json'

export const dynamic = 'force-dynamic'

interface NubankTx {
  date: string   // YYYY-MM-DD
  amount: number
  type: 'CREDITO' | 'DEBITO'
  label: string
  category: string
}

function allCreditTxns(): NubankTx[] {
  const txns: NubankTx[] = []
  for (const acc of cache.accounts) {
    for (const period of acc.periods) {
      for (const t of period.transactions) {
        if (t.type === 'CREDITO') {
          txns.push({ date: t.date, amount: t.amount, type: t.type, label: t.label, category: t.category })
        }
      }
    }
  }
  return txns
}

function dateDiffDays(a: string, b: string): number {
  return Math.abs((new Date(a).getTime() - new Date(b).getTime()) / 86_400_000)
}

export async function GET() {
  const [notionEntries, credits] = await Promise.all([
    fetchAllTransactions(),
    Promise.resolve(allCreditTxns()),
  ])

  const results = notionEntries
    .filter((e) => e.value > 0)
    .map((entry) => {
      const refDate = entry.paymentDate

      // Find best matching Nubank credit: value within 5%, date within 10 days (if date exists)
      const candidates = credits.filter((tx) => {
        const valueDiff = Math.abs(tx.amount - entry.value) / entry.value
        if (valueDiff > 0.05) return false
        if (refDate && dateDiffDays(tx.date, refDate) > 10) return false
        return true
      })

      const bestMatch = candidates.sort((a, b) => {
        const va = Math.abs(a.amount - entry.value)
        const vb = Math.abs(b.amount - entry.value)
        return va - vb
      })[0] ?? null

      let status: 'confirmado' | 'nao_encontrado' | 'sem_data'
      if (!refDate) {
        status = bestMatch ? 'confirmado' : 'sem_data'
      } else {
        status = bestMatch ? 'confirmado' : 'nao_encontrado'
      }

      return {
        id: entry.id,
        name: entry.name,
        value: entry.value,
        paymentDate: entry.paymentDate,
        realized: entry.realized,
        linkedProjectNames: entry.linkedProjectNames,
        status,
        match: bestMatch
          ? { date: bestMatch.date, amount: bestMatch.amount, label: bestMatch.label, category: bestMatch.category }
          : null,
      }
    })

  return NextResponse.json({
    total: results.length,
    confirmados: results.filter((r) => r.status === 'confirmado').length,
    pendentes: results.filter((r) => r.status === 'nao_encontrado').length,
    semData: results.filter((r) => r.status === 'sem_data').length,
    entries: results,
  })
}
