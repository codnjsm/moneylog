import type { FixedItem, SavingsItem, Expense, CategoryDef, AssetAccount, AssetSnapshot } from '../../types'
import DonutChart from '../DonutChart'
import { fmtWon as fmt } from '../../utils'

interface Props {
  incomeEntries: Expense[]
  fixedItems: FixedItem[]
  savingsItems: SavingsItem[]
  expenses: Expense[]
  categories: CategoryDef[]
  accounts: AssetAccount[]
  snapshot: AssetSnapshot | null
}


const PALETTE = ['#4FA3E0', '#F87171', '#FBBF24', '#A78BFA', '#34D399', '#F472B6', '#FB923C', '#94A3B8']

function SectionWithChart({ title, segments, total, emptyMsg }: {
  title: string
  segments: { label: string; value: number; color: string }[]
  total: number
  emptyMsg: string
}) {
  return (
    <div className="dash-section">
      <div className="dash-section-title">{title}</div>
      {segments.length === 0 ? (
        <div className="dash-empty-sm">{emptyMsg}</div>
      ) : (
        <div className="dash-chart-row">
          <DonutChart
            segments={segments}
            size={130}
            centerValue={total.toLocaleString('ko-KR')}
          />
          <div className="dash-legend">
            {segments.map((s, i) => (
              <div key={i} className="dash-legend-row">
                <span className="dash-legend-dot" style={{ background: s.color }} />
                <span className="dash-legend-label">{s.label}</span>
                <span className="dash-legend-value">{fmt(s.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function DashboardTab({ incomeEntries, fixedItems, savingsItems, expenses, categories, accounts, snapshot }: Props) {
  const amounts = snapshot?.amounts ?? {}
  const liquidTotal = accounts.filter(a => a.liquid !== false).reduce((s, a) => s + (amounts[a.id] ?? 0), 0)
  const illiquidTotal = accounts.filter(a => a.liquid === false).reduce((s, a) => s + (amounts[a.id] ?? 0), 0)
  const assetTotal = liquidTotal + illiquidTotal
  const assetSegments = [
    ...(liquidTotal > 0 ? [{ label: '유동 자산', value: liquidTotal, color: '#4FA3E0' }] : []),
    ...(illiquidTotal > 0 ? [{ label: '비유동 자산', value: illiquidTotal, color: '#A78BFA' }] : []),
  ]

  const totalIncome = incomeEntries.reduce((s, e) => s + e.amount, 0)
  const totalFixed = fixedItems.reduce((s, i) => s + i.amount, 0)
  const totalSavings = savingsItems.reduce((s, i) => s + i.amount, 0)
  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0)

  const expenseByCategory = expenses.reduce((acc, e) => {
    const key = e.category ?? '__none__'
    acc[key] = (acc[key] ?? 0) + e.amount
    return acc
  }, {} as Record<string, number>)

  const incomeByLabel = incomeEntries.reduce((acc, e) => {
    acc[e.label] = (acc[e.label] ?? 0) + e.amount
    return acc
  }, {} as Record<string, number>)
  const incomeSegments = Object.entries(incomeByLabel).map(([label, value], i) => ({
    label, value, color: PALETTE[i % PALETTE.length],
  }))

  const fixedSegments = fixedItems.map((item, i) => ({
    label: item.label, value: item.amount, color: PALETTE[i % PALETTE.length],
  }))

  const savingsSegments = savingsItems.map((item, i) => ({
    label: item.label, value: item.amount, color: PALETTE[i % PALETTE.length],
  }))


  const expenseSegments = [
    ...categories
      .filter(c => (expenseByCategory[c.id] ?? 0) > 0)
      .map(c => ({ label: c.label, value: expenseByCategory[c.id], color: c.color })),
    ...(expenseByCategory['__none__'] ? [{ label: '미분류', value: expenseByCategory['__none__'], color: '#94A3B8' }] : []),
  ]

  return (
    <div className="tab-content">
      <SectionWithChart
        title="자산"
        segments={assetSegments}
        total={assetTotal}
        emptyMsg="자산 탭에서 계좌를 추가하세요"
      />
      <SectionWithChart
        title="수입"
        segments={incomeSegments}
        total={totalIncome}
        emptyMsg="예산 탭에서 수입을 입력하세요"
      />
      <SectionWithChart
        title="고정 지출"
        segments={fixedSegments}
        total={totalFixed}
        emptyMsg="예산 탭에서 항목을 추가하세요"
      />
      <SectionWithChart
        title="적금"
        segments={savingsSegments}
        total={totalSavings}
        emptyMsg="예산 탭에서 항목을 추가하세요"
      />
      <SectionWithChart
        title="변동 지출"
        segments={expenseSegments}
        total={totalExpense}
        emptyMsg="지출 탭에서 기록하세요"
      />
    </div>
  )
}
