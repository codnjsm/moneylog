import { useState } from 'react'
import type { Expense, PaymentMethodDef, CategoryDef } from '../../types'
import CustomSelect from '../CustomSelect'

interface Props {
  expenses: Expense[]
  yearMonth: string
  methods: PaymentMethodDef[]
  categories: CategoryDef[]
  totalIncome: number
  totalFixed: number
  totalSavings: number
  onAdd: () => void
  onEdit: (expense: Expense) => void
  onEditMethods: () => void
  onEditCategories: () => void
}

const fmt = (n: number) => n.toLocaleString('ko-KR')

export default function ExpenseTab({ expenses, methods, categories, totalIncome, totalFixed, totalSavings, onAdd, onEdit, onEditMethods, onEditCategories }: Props) {
  const [filterMethod, setFilterMethod] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')

  const specialCategory = categories.find((c) => c.label === '특별 지출')
  const regularExpenses = expenses.filter((e) => !specialCategory || e.category !== specialCategory.id)
  const specialExpenses = specialCategory ? expenses.filter((e) => e.category === specialCategory.id) : []
  const totalSpecial = specialExpenses.reduce((s, e) => s + e.amount, 0)

  const filtered = regularExpenses.filter((e) => {
    const methodMatch = filterMethod === 'all' || e.paymentMethod === filterMethod
    const categoryMatch = filterCategory === 'all' || e.category === filterCategory
    return methodMatch && categoryMatch
  })
  const totalByMethod = methods.reduce((acc, m) => {
    acc[m.id] = filtered.filter((e) => e.paymentMethod === m.id).reduce((s, e) => s + e.amount, 0)
    return acc
  }, {} as Record<string, number>)
  const getMethod = (id: string) => methods.find(m => m.id === id) ?? { id, label: id, color: '#94A3B8' }

  const methodOptions = [
    { value: 'all', label: '결제수단 전체' },
    ...methods.map(m => ({ value: m.id, label: m.label })),
  ]
  const categoryOptions = [
    { value: 'all', label: '카테고리 전체' },
    ...categories.filter(c => c.id !== specialCategory?.id).map(c => ({ value: c.id, label: c.label })),
  ]

  const totalExpense = regularExpenses.reduce((s, e) => s + e.amount, 0)
  const remaining = totalIncome - totalFixed - totalSavings - totalExpense

  return (
    <div className="tab-content">
      <div className="dash-section dash-remaining-section">
        <div className="dash-remaining-item">
          <span className="dash-section-title">총 지출</span>
          <span className="dash-remaining-value expense">{fmt(totalExpense)}원</span>
        </div>
        <div className="dash-remaining-item">
          <span className="dash-section-title">남은 금액</span>
          <span className={`dash-remaining-value${remaining < 0 ? ' expense' : ' income'}`}>
            {remaining < 0 ? '−' : ''}{Math.abs(remaining).toLocaleString('ko-KR')}원
          </span>
        </div>
      </div>

      {filterMethod === 'all' && filtered.length > 0 && (
        <div className="method-summary">
          {methods.filter((m) => totalByMethod[m.id] > 0).map((m) => (
            <div key={m.id} className="method-summary-row">
              <span className="method-dot" style={{ background: m.color }} />
              <span>{m.label}</span>
              <span>{fmt(totalByMethod[m.id])}원</span>
            </div>
          ))}
        </div>
      )}

      <div className="filter-row-wrap">
        <CustomSelect value={filterCategory} options={categoryOptions} onChange={setFilterCategory} action={{ label: '카테고리 편집', onClick: onEditCategories }} />
        <CustomSelect value={filterMethod} options={methodOptions} onChange={setFilterMethod} action={{ label: '결제수단 편집', onClick: onEditMethods }} />
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>지출 내역이 없어요</p>
          <p className="empty-sub">아래 + 버튼으로 추가하세요</p>
        </div>
      ) : (
        <div className="expense-list">
          {filtered.map((e) => {
            const m = getMethod(e.paymentMethod ?? '')
            return (
              <div key={e.id} className="expense-card" onClick={() => onEdit(e)}>
                <div className="expense-card-row1">
                  <div className="expense-badges">
                    {e.category && (() => {
                      const cat = categories.find(c => c.id === e.category)
                      const color = cat?.color ?? '#94A3B8'
                      return <span className="category-badge" style={{ color, background: color + '26' }}>{cat?.label ?? e.category}</span>
                    })()}
                    <span className="method-badge" style={{ color: m.color, background: m.color + '26' }}>{m.label}</span>
                  </div>
                  <div className="expense-date">{e.date.slice(5).replace('-', '/')}</div>
                </div>
                <div className="expense-card-row2">
                  <div className="expense-label">{e.label}</div>
                  <div className="expense-amount">{fmt(e.amount)}원</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {specialExpenses.length > 0 && (
        <>
          <div className="section-divider" />
          <div className="dash-section dash-remaining-section">
            <div className="dash-remaining-item">
              <span className="dash-section-title">특별 지출</span>
              <span className="dash-remaining-value expense">{fmt(totalSpecial)}원</span>
            </div>
          </div>
          <div className="expense-list special-section">
            {specialExpenses.map((e) => {
              const m = getMethod(e.paymentMethod ?? '')
              return (
                <div key={e.id} className="expense-card" onClick={() => onEdit(e)}>
                  <div className="expense-card-row1">
                    <div className="expense-badges">
                      <span className="method-badge" style={{ color: m.color, background: m.color + '26' }}>{m.label}</span>
                    </div>
                    <div className="expense-date">{e.date.slice(5).replace('-', '/')}</div>
                  </div>
                  <div className="expense-card-row2">
                    <div className="expense-label">{e.label}</div>
                    <div className="expense-amount">{fmt(e.amount)}원</div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      <button className="fab" onClick={onAdd}>+</button>
    </div>
  )
}
