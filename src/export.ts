import type { exportAllData } from './firebase'
import { fmtWon as won, stockProfitOf } from './utils'
import { DEFAULT_PAYMENT_METHODS, DEFAULT_CATEGORIES, DEFAULT_STOCK_CATEGORIES } from './types'

export type ExportData = Awaited<ReturnType<typeof exportAllData>>
export type ExpenseRecord = ExportData['expenses'][number]

export function filterByRange(data: ExportData, from: string, to: string): ExportData {
  const inRange = (ym: string) => (!from || ym >= from) && (!to || ym <= to)
  return {
    ...data,
    expenses: data.expenses?.filter((e) => inRange(e.yearMonth)) ?? [],
    fixedMonthly: data.fixedMonthly?.filter((e) => inRange(e.yearMonth)) ?? [],
    savingsMonthly: data.savingsMonthly?.filter((e) => inRange(e.yearMonth)) ?? [],
    monthlyIncome: data.monthlyIncome?.filter((e) => inRange(e.yearMonth)) ?? [],
    assetSnapshots: data.assetSnapshots?.filter((e) => inRange(e.yearMonth)) ?? [],
    stockTrades: data.stockTrades?.filter((e) => inRange(e.yearMonth)) ?? [],
  }
}

export function formatAsText(data: ExportData): string {
  const lines: string[] = []
  // 커스터마이즈한 적이 없으면 Firestore 에 문서가 없다 — 앱과 같이 기본값으로 채운다.
  // (안 그러면 라벨 대신 'food', 'samsung' 같은 id 가 그대로 찍힌다)
  const methods = data.paymentMethods?.methods ?? DEFAULT_PAYMENT_METHODS
  const cats = data.categories?.categories ?? DEFAULT_CATEGORIES
  const stockCats = data.stockCategories?.categories ?? DEFAULT_STOCK_CATEGORIES

  const catMap: Record<string, string> = {}
  for (const c of cats) catMap[c.id] = c.label
  const methodMap: Record<string, string> = {}
  for (const m of methods) methodMap[m.id] = m.label
  const accountMap: Record<string, string> = {}
  for (const a of data.assetAccounts ?? []) accountMap[a.id] = a.label
  const stockCatMap: Record<string, string> = {}
  for (const c of stockCats) stockCatMap[c.id] = c.label

  lines.push('Moneylog 데이터 백업')
  lines.push(`내보낸 날짜: ${data.exportedAt?.slice(0, 10) ?? ''}`)

  // 지출/수입
  lines.push('\n\n━━━ 지출 / 수입 내역 ━━━')
  const byMonth: Record<string, ExpenseRecord[]> = {}
  for (const e of data.expenses ?? []) {
    (byMonth[e.yearMonth] ??= []).push(e)
  }
  for (const ym of Object.keys(byMonth).sort()) {
    lines.push(`\n[${ym}]`)
    const sorted = byMonth[ym].sort((a, b) => a.date.localeCompare(b.date))
    const incomes = sorted.filter((e) => e.type === 'income')
    const expenses = sorted.filter((e) => e.type !== 'income')
    if (incomes.length) {
      lines.push('  ▸ 수입')
      // 주식 손실이 연동 수입으로 들어오면 금액이 음수다 — 부호를 앞에 한 번만 붙인다
      for (const e of incomes)
        lines.push(`    ${e.date}  ${e.label}  ${e.amount < 0 ? '-' : '+'}${won(Math.abs(e.amount))}`)
    }
    if (expenses.length) {
      lines.push('  ▸ 지출')
      for (const e of expenses) {
        const cat = e.category ? ` [${catMap[e.category] ?? e.category}]` : ''
        const method = e.paymentMethod ? ` (${methodMap[e.paymentMethod] ?? e.paymentMethod})` : ''
        lines.push(`    ${e.date}  ${e.label}${cat}  -${won(e.amount)}${method}`)
      }
    }
  }

  // 고정 지출
  if (data.fixedMonthly?.length) {
    lines.push('\n\n━━━ 고정 지출 내역 ━━━')
    for (const fm of [...data.fixedMonthly].sort((a, b) => a.yearMonth.localeCompare(b.yearMonth))) {
      lines.push(`\n[${fm.yearMonth}]`)
      for (const item of fm.items ?? [])
        lines.push(`  ${item.label}: ${won(item.amount)}${item.paymentDay ? ` (매월 ${item.paymentDay}일)` : ''}`)
    }
  }

  // 적금
  if (data.savingsMonthly?.length) {
    lines.push('\n\n━━━ 적금 / 보험 내역 ━━━')
    for (const sm of [...data.savingsMonthly].sort((a, b) => a.yearMonth.localeCompare(b.yearMonth))) {
      lines.push(`\n[${sm.yearMonth}]`)
      for (const item of sm.items ?? []) {
        const day = item.paymentDay ? ` (매월 ${item.paymentDay}일)` : ''
        const maturity = item.maturityDate ? ` [만기 ${item.maturityDate.slice(0, 7)}]` : ''
        lines.push(`  ${item.label}: ${won(item.amount)}${day}${maturity}`)
      }
    }
  }

  // 자산 스냅샷
  if (data.assetSnapshots?.length) {
    lines.push('\n\n━━━ 자산 현황 ━━━')
    for (const snap of [...data.assetSnapshots].sort((a, b) => a.yearMonth.localeCompare(b.yearMonth))) {
      const total = Object.values(snap.amounts as Record<string, number>).reduce((s, v) => s + v, 0)
      lines.push(`\n[${snap.yearMonth}] 기준일: ${snap.asOf}  /  합계: ${won(total)}`)
      for (const [id, amt] of Object.entries(snap.amounts as Record<string, number>))
        lines.push(`  ${accountMap[id] ?? id}: ${won(amt)}`)
    }
  }

  // 주식 거래
  if (data.stockTrades?.length) {
    lines.push('\n\n━━━ 주식 거래 내역 ━━━')
    const byTradeMonth: Record<string, ExportData['stockTrades']> = {}
    for (const t of data.stockTrades) (byTradeMonth[t.yearMonth] ??= []).push(t)
    for (const ym of Object.keys(byTradeMonth).sort()) {
      const trades = [...byTradeMonth[ym]].sort((a, b) => a.sellDate.localeCompare(b.sellDate))
      const monthProfit = trades.reduce((sum, t) => sum + stockProfitOf(t), 0)
      lines.push(`\n[${ym}] 손익 합계: ${monthProfit < 0 ? '-' : '+'}${won(Math.abs(monthProfit))}`)
      for (const t of trades) {
        const profit = stockProfitOf(t)
        const cat = t.category ? ` [${stockCatMap[t.category] ?? t.category}]` : ''
        lines.push(`  ${t.sellDate}  ${t.label}${cat}`)
        lines.push(`    매수 ${won(t.buyPrice)} → 매도 ${won(t.sellPrice)} × ${t.quantity}주  =  ${profit < 0 ? '-' : '+'}${won(Math.abs(profit))}`)
      }
    }
  }

  // 결제수단 / 카테고리
  lines.push('\n\n━━━ 결제 수단 ━━━')
  for (const m of methods)
    lines.push(`  ${m.label}`)

  lines.push('\n━━━ 카테고리 ━━━')
  for (const c of cats)
    lines.push(`  ${c.label}`)

  return lines.join('\n')
}
