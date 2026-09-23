import type { Expense, FixedItem, SavingsItem, CategoryDef, PaymentMethodDef, AssetAccount, AssetSnapshot, AssetTypeDef } from '../../types'
import DonutChart from '../DonutChart'
import { fmtNum, fmtWon } from '../../utils'

interface Props {
  yearMonth: string
  expenses: Expense[]
  fixedItems: FixedItem[]
  savingsItems: SavingsItem[]
  categories: CategoryDef[]
  methods: PaymentMethodDef[]
  assetAccounts: AssetAccount[]
  assetSnapshot: AssetSnapshot | null
  assetTypes: AssetTypeDef[]
  onAddExpense: () => void
  onAddIncome: () => void
  onEditIncomeEntry: (item: Expense) => void
}

export default function HomeTab({ yearMonth, expenses, fixedItems, savingsItems, categories, methods, assetAccounts, assetSnapshot, assetTypes, onAddExpense, onAddIncome, onEditIncomeEntry }: Props) {
  const today = new Date()
  const isCurrentMonth = yearMonth === today.toISOString().slice(0, 7)
  const todayDate = today.getDate()
  const [y, m] = yearMonth.split('-').map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()
  const daysLeft = isCurrentMonth ? daysInMonth - todayDate : null

  const specialCategory = categories.find((c) => c.label === '특별 지출')
  const incomeEntries = expenses.filter((e) => e.type === 'income')
  const expenseEntries = expenses.filter((e) => e.type !== 'income')
  const regularExpenseEntries = expenseEntries.filter((e) => !specialCategory || e.category !== specialCategory.id)
  const totalIncome = incomeEntries.reduce((s, e) => s + e.amount, 0)
  const totalFixed = fixedItems.reduce((s, i) => s + i.amount, 0)
  const totalSavings = savingsItems.reduce((s, i) => s + i.amount, 0)
  const totalExpense = regularExpenseEntries.reduce((s, e) => s + e.amount, 0)
  const budget = totalIncome - totalFixed - totalSavings
  const remaining = budget - totalExpense
  const hasAnyData = totalIncome > 0 || expenses.length > 0

  const upcoming = isCurrentMonth
    ? [
        ...fixedItems.filter((i) => i.paymentDay).map((i) => ({ label: i.label, amount: i.amount, day: i.paymentDay! })),
        ...savingsItems.filter((i) => i.paymentDay).map((i) => ({ label: i.label, amount: i.amount, day: i.paymentDay! })),
      ]
        .map((i) => ({ ...i, diff: i.day - todayDate }))
        .filter((i) => i.diff >= 0 && i.diff <= 7)
        .sort((a, b) => a.diff - b.diff)
        .slice(0, 3)
    : []

  const expenseByCategory = regularExpenseEntries.reduce((acc, e) => {
    const key = e.category ?? '__none__'
    acc[key] = (acc[key] ?? 0) + e.amount
    return acc
  }, {} as Record<string, number>)
  const topEntry = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1])[0]
  const topCategory = topEntry ? categories.find((c) => c.id === topEntry[0]) : undefined
  const topLabel = topEntry ? (topCategory?.label ?? '미분류') : null
  const topColor = topCategory?.color ?? 'var(--text-dim)'
  const topAmount = topEntry?.[1] ?? 0
  const topPct = totalExpense > 0 && topEntry ? Math.round((topAmount / totalExpense) * 100) : 0

  const categoryChart = categories
    .filter((c) => (expenseByCategory[c.id] ?? 0) > 0)
    .map((c) => ({ label: c.label, value: expenseByCategory[c.id], color: c.color }))
  if (expenseByCategory['__none__']) categoryChart.push({ label: '미분류', value: expenseByCategory['__none__'], color: 'var(--text-dim)' })
  categoryChart.sort((a, b) => b.value - a.value)

  const recent = [...expenses].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)).slice(0, 5)

  const assetAmounts = assetSnapshot?.amounts ?? {}
  const totalAssets = assetAccounts.reduce((s, a) => s + (assetAmounts[a.id] ?? 0), 0)
  const assetByType = assetAccounts.reduce((acc, a) => {
    acc[a.type] = (acc[a.type] ?? 0) + (assetAmounts[a.id] ?? 0)
    return acc
  }, {} as Record<string, number>)
  const assetTypeRows = assetTypes
    .filter((t) => (assetByType[t.id] ?? 0) > 0)
    .map((t) => ({ label: t.label, value: assetByType[t.id] }))

  const sortedIncome = [...incomeEntries].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="tab-content">
      {!hasAnyData ? (
        <div className="empty-state">
          <p>이번 달 기록이 아직 없어요</p>
          <p className="empty-sub">수입이나 지출을 추가해보세요</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button className="btn btn-secondary btn-sm" onClick={onAddIncome}>+ 수입 추가</button>
            <button className="btn btn-primary btn-sm" onClick={onAddExpense}>+ 지출 추가</button>
          </div>
        </div>
      ) : (
        <>
          <div className="dash-section">
            <div className="home-hero-top">
              <div>
                <h2 className="dash-section-title">남은 지출 가능액</h2>
                <div className="home-hero-value">
                  {remaining < 0 ? '−' : ''}{fmtNum(Math.abs(remaining))}원
                </div>
              </div>
              {daysLeft !== null && <span className="home-hero-days">{daysLeft}일 남음</span>}
            </div>
            <div className="home-hero-actions">
              <button className="btn btn-primary btn-sm" onClick={onAddExpense}>+ 지출 추가</button>
            </div>
            {upcoming.length > 0 && (
              <div className="home-upcoming">
                <div className="home-upcoming-title">다가오는 결제</div>
                {upcoming.map((u, i) => (
                  <div key={i} className="home-upcoming-row">
                    <span className="home-upcoming-day">{u.diff === 0 ? '오늘' : u.diff === 1 ? '내일' : `${u.diff}일 후`}</span>
                    <span className="home-upcoming-label">{u.label}</span>
                    <span className="home-upcoming-amount">{fmtNum(u.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {totalIncome > 0 && (
            <div className="dash-section">
              <div className="home-prog-top">
                <h2 className="dash-section-title">이번 달 예산 사용</h2>
                {budget > 0 && (
                  <span className="home-prog-pct" style={{ color: totalExpense > budget ? 'var(--expense)' : 'var(--text)' }}>
                    {Math.round((totalExpense / budget) * 100)}%
                  </span>
                )}
              </div>
              {budget > 0 ? (
                <>
                  <div className="home-prog-track">
                    <div
                      className="home-prog-fill"
                      style={{ width: `${Math.min(100, (totalExpense / budget) * 100)}%` }}
                    />
                  </div>
                  <div className="home-prog-sub">
                    <span>{fmtNum(totalExpense)}원 사용</span>
                    <span>{fmtNum(budget)}원 중</span>
                  </div>
                </>
              ) : (
                <div className="dash-empty-sm">고정 지출과 적금이 수입보다 많아요</div>
              )}
            </div>
          )}

          {topEntry && (
            <div className="dash-section">
              <div className="home-highlight">
                <div className="home-highlight-text">
                  <h2 className="dash-section-title">이번 달 가장 많이 쓴 곳</h2>
                  <div className="home-highlight-amount-row">
                    <span className="home-highlight-chip">
                      <span className="dash-legend-dot" style={{ background: topColor }} />
                      {topLabel}
                    </span>
                    <span className="home-highlight-amount">{fmtNum(topAmount)}원</span>
                  </div>
                </div>
                <span className="home-highlight-pct">전체의 {topPct}%</span>
              </div>
            </div>
          )}

          {categoryChart.length > 0 && (
            <div className="dash-section">
              <h2 className="dash-section-title">카테고리별 지출</h2>
              <div className="dash-chart-row">
                <div className="dash-chart-donut">
                  <DonutChart segments={categoryChart} size={200} centerValue={fmtNum(totalExpense)} />
                </div>
                <div className="dash-legend">
                  {categoryChart.map((s, i) => (
                    <div key={i} className="dash-legend-row">
                      <span className="dash-legend-dot" style={{ background: s.color }} />
                      <span className="dash-legend-label">{s.label}</span>
                      <span className="dash-legend-value">{fmtNum(s.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {incomeEntries.length > 0 && (
            <div className="fixed-section">
              <div className="fixed-section-header">
                <h2 className="fixed-section-title" data-accent="income">수입</h2>
                <button className="add-btn" onClick={onAddIncome}>+ 추가</button>
              </div>
              {sortedIncome.map((item) => (
                <div key={item.id} className="fixed-row clickable" onClick={() => onEditIncomeEntry(item)}>
                  <span className="fixed-row-label">
                    {item.label}
                    <span className="fixed-row-sub">{item.date.slice(5).replace('-', '/')}</span>
                  </span>
                  <span className="fixed-row-amount">{fmtWon(item.amount)}</span>
                </div>
              ))}
              <div className="fixed-row total">
                <span>합계</span>
                <span className="income">{fmtWon(totalIncome)}</span>
              </div>
            </div>
          )}

          {assetTypeRows.length > 0 && (
            <div className="fixed-section">
              <div className="fixed-section-header">
                <h2 className="fixed-section-title" data-accent="assets">총 자산</h2>
              </div>
              {assetTypeRows.map((row, i) => (
                <div key={i} className="fixed-row">
                  <span className="fixed-row-label">{row.label}</span>
                  <span className="fixed-row-amount">{fmtWon(row.value)}</span>
                </div>
              ))}
              <div className="fixed-row total">
                <span>합계</span>
                <span>{fmtWon(totalAssets)}</span>
              </div>
            </div>
          )}

          {recent.length > 0 && (
            <div className="dash-section">
              <h2 className="dash-section-title" style={{ marginBottom: 11 }}>최근 활동</h2>
              {recent.map((e) => {
                const isIncome = e.type === 'income'
                const dotColor = isIncome ? 'var(--income)' : (methods.find((m) => m.id === e.paymentMethod)?.color ?? 'var(--text-dim)')
                return (
                  <div key={e.id} className="home-feed-row">
                    <span className="home-feed-dot" style={{ background: dotColor }} />
                    <span className="home-feed-label">{e.label}</span>
                    <span className="home-feed-date">{e.date.slice(5).replace('-', '/')}</span>
                    <span className="home-feed-amount" style={{ color: isIncome ? 'var(--accent)' : 'var(--expense)' }}>
                      {isIncome ? '+' : '−'}{fmtNum(e.amount)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
