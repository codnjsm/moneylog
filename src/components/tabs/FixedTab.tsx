import type { FixedItem, SavingsItem, Expense } from '../../types'
import { fmtWon as fmt } from '../../utils'

interface Props {
  incomeEntries: Expense[]
  fixedItems: FixedItem[]
  savingsItems: SavingsItem[]
  onAddIncome: () => void
  onEditIncomeEntry: (e: Expense) => void
  onManageFixed: () => void
  onManageSavings: () => void
}


export default function FixedTab({ incomeEntries, fixedItems, savingsItems, onAddIncome, onEditIncomeEntry, onManageFixed, onManageSavings }: Props) {
  const totalFixed = fixedItems.reduce((s, i) => s + i.amount, 0)
  const totalSavings = savingsItems.reduce((s, i) => s + i.amount, 0)
  const totalIncome = incomeEntries.reduce((s, e) => s + e.amount, 0)

  const sortedIncome = [...incomeEntries].sort((a, b) => b.date.localeCompare(a.date))
  const sortedSavings = [...savingsItems].sort((a, b) => {
    if (!a.paymentDay && !b.paymentDay) return 0
    if (!a.paymentDay) return -1
    if (!b.paymentDay) return 1
    return a.paymentDay - b.paymentDay
  })

  const availableAmount = totalIncome - totalFixed - totalSavings

  return (
    <div className="tab-content">
      {/* 수입 */}
      <div className="fixed-section">
        <div className="fixed-section-header">
          <span className="fixed-section-title" data-accent="income">수입</span>
          <button className="add-btn" onClick={onAddIncome}>+ 추가</button>
        </div>
        {sortedIncome.length === 0 ? (
          <div className="fixed-empty">항목이 없어요</div>
        ) : (
          sortedIncome.map((item) => (
            <div key={item.id} className="fixed-row clickable" onClick={() => onEditIncomeEntry(item)}>
              <span className="fixed-row-label">
                {item.label}
                <span className="fixed-row-sub">{item.date.slice(5).replace('-', '/')}</span>
              </span>
              <span className="fixed-row-amount">{fmt(item.amount)}</span>
            </div>
          ))
        )}
        {totalIncome > 0 && (
          <div className="fixed-row total">
            <span>합계</span>
            <span className="income">{fmt(totalIncome)}</span>
          </div>
        )}
      </div>

      {/* 고정 지출 */}
      <div className="fixed-section">
        <div className="fixed-section-header">
          <span className="fixed-section-title" data-accent="expense">고정 지출</span>
          <button className="add-btn" onClick={onManageFixed}>{fixedItems.length === 0 ? '+ 추가' : '수정'}</button>
        </div>
        {fixedItems.length === 0 ? (
          <div className="fixed-empty">항목이 없어요</div>
        ) : (
          fixedItems.map((item) => (
            <div key={item.id} className="fixed-row clickable" onClick={onManageFixed}>
              <span className="fixed-row-label">
                {item.label}
                {item.paymentDay && <span className="fixed-row-sub"> 매월 {item.paymentDay}일</span>}
              </span>
              <span className="fixed-row-amount">{fmt(item.amount)}</span>
            </div>
          ))
        )}
        {fixedItems.length > 0 && (
          <div className="fixed-row total">
            <span>합계</span>
            <span>{fmt(totalFixed)}</span>
          </div>
        )}
      </div>

      {/* 적금 */}
      <div className="fixed-section">
        <div className="fixed-section-header">
          <span className="fixed-section-title" data-accent="savings">
            적금
            {totalIncome > 0 && (
              <span className="fixed-section-sub" style={{ color: 'var(--accent)' }}>(저축률 {Math.round((totalSavings / totalIncome) * 100)}%)</span>
            )}
          </span>
          <button className="add-btn" onClick={onManageSavings}>{savingsItems.length === 0 ? '+ 추가' : '수정'}</button>
        </div>
        {savingsItems.length === 0 ? (
          <div className="fixed-empty">항목이 없어요</div>
        ) : (
          sortedSavings.map((item) => (
            <div key={item.id} className="fixed-row clickable" onClick={onManageSavings}>
              <span className="fixed-row-label">
                {item.label}
                <span className="fixed-row-sub">
                  {item.paymentDay && ` 매월 ${item.paymentDay}일`}
                  {item.maturityDate && ` · 만기 ${item.maturityDate.slice(0, 7)}`}
                </span>
              </span>
              <span className="fixed-row-amount">{fmt(item.amount)}</span>
            </div>
          ))
        )}
        {savingsItems.length > 0 && (
          <div className="fixed-row total">
            <span>합계</span>
            <span>{fmt(totalSavings)}</span>
          </div>
        )}
      </div>

      {totalIncome > 0 && (
        <div className="dash-section">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div className="dash-remaining-item">
              <span style={{ fontSize: '13px', color: 'var(--text-dim)' }}>수입</span>
              <span style={{ fontSize: '13px' }}>{fmt(totalIncome)}</span>
            </div>
            {totalFixed > 0 && (
              <div className="dash-remaining-item">
                <span style={{ fontSize: '13px', color: 'var(--text-dim)' }}>고정 지출</span>
                <span style={{ fontSize: '13px', color: 'var(--error, #f87171)' }}>− {fmt(totalFixed)}</span>
              </div>
            )}
            {totalSavings > 0 && (
              <div className="dash-remaining-item">
                <span style={{ fontSize: '13px', color: 'var(--text-dim)' }}>적금</span>
                <span style={{ fontSize: '13px', color: 'var(--error, #f87171)' }}>− {fmt(totalSavings)}</span>
              </div>
            )}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>지출 가능액</span>
              <span className="dash-remaining-value" style={{ color: availableAmount >= 0 ? 'var(--success)' : 'var(--error, #f87171)' }}>
                {fmt(availableAmount)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
