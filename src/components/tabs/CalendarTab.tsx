import { useState, useEffect, useMemo } from 'react'
import type { Expense, PaymentMethodDef, IncomeItem } from '../../types'

interface Props {
  expenses: Expense[]
  recurringIncome: IncomeItem[]
  yearMonth: string
  methods: PaymentMethodDef[]
  onAddIncome: (date: string) => void
  onAddExpense: (date: string) => void
  onEditEntry: (item: Expense) => void
  onEditRecurringIncome: (item: IncomeItem) => void
}

/** 반복 수입은 달력에 찍으려고 그 달의 가짜 항목으로 만들어 쓴다. recurringId 로 구분한다. */
type CalItem = Expense & { recurringId?: string }

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

export default function CalendarTab({ expenses, recurringIncome, yearMonth, methods, onAddIncome, onAddExpense, onEditEntry, onEditRecurringIncome }: Props) {
  const today = new Date().toISOString().slice(0, 10)
  const [selectedDate, setSelectedDate] = useState<string | null>(
    today.startsWith(yearMonth) ? today : null
  )

  useEffect(() => {
    setSelectedDate(today.startsWith(yearMonth) ? today : null)
  }, [yearMonth])

  const [year, month] = yearMonth.split('-').map(Number)
  const firstDow = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()

  // 반복 수입을 이 달의 항목으로 펼친다. 31일로 잡아둔 것이 2월에 사라지지 않도록 말일로 당긴다.
  const items: CalItem[] = useMemo(() => [
    ...expenses,
    ...recurringIncome.map((i) => ({
      id: `recurring-${i.id}`,
      uid: '',
      yearMonth,
      date: `${yearMonth}-${String(Math.min(i.paymentDay, daysInMonth)).padStart(2, '0')}`,
      label: i.label,
      amount: i.amount,
      paymentMethod: '',
      type: 'income' as const,
      recurringId: i.id,
    })),
  ], [expenses, recurringIncome, yearMonth, daysInMonth])

  const byDate = useMemo(() => {
    const map: Record<string, CalItem[]> = {}
    for (const e of items) {
      if (!map[e.date]) map[e.date] = []
      map[e.date].push(e)
    }
    return map
  }, [items])

  const monthExpense = useMemo(() => items.filter(e => e.type !== 'income').reduce((s, e) => s + e.amount, 0), [items])
  const monthIncome = useMemo(() => items.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0), [items])

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const selectedItems = selectedDate ? (byDate[selectedDate] ?? []) : []
  const selectedExpense = selectedItems.filter(e => e.type !== 'income').reduce((s, e) => s + e.amount, 0)
  const selectedIncome = selectedItems.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0)

  const getMethod = (id: string) => methods.find(m => m.id === id)
  const fmtNum = (n: number) => n.toLocaleString('ko-KR')
  const fmtWon = (n: number) => `₩${n.toLocaleString('ko-KR')}`

  const formatDate = (d: string) => {
    const [y, m, day] = d.split('-')
    return `${y}년 ${Number(m)}월 ${Number(day)}일`
  }

  return (
    <div className="calendar-tab">
      <div className="cal-month-summary">
        <div className="cal-summary-item">
          <span className="cal-summary-label">수입</span>
          <span className="cal-summary-value cal-income-amt">{fmtWon(monthIncome)}</span>
        </div>
        <div className="cal-summary-item">
          <span className="cal-summary-label">지출</span>
          <span className="cal-summary-value cal-expense-amt">{fmtWon(monthExpense)}</span>
        </div>
      </div>

      <div className="cal-grid">
        {DAY_LABELS.map(d => (
          <div key={d} className="cal-weekday">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="cal-cell cal-empty" />
          const dateStr = `${yearMonth}-${String(day).padStart(2, '0')}`
          const items = byDate[dateStr] ?? []
          const dayExpense = items.filter(e => e.type !== 'income').reduce((s, e) => s + e.amount, 0)
          const dayIncome = items.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0)
          const isToday = dateStr === today
          const isSelected = dateStr === selectedDate
          return (
            <div
              key={i}
              className={`cal-cell${isToday ? ' cal-today' : ''}${isSelected ? ' cal-selected' : ''}`}
              onClick={() => setSelectedDate(isSelected ? null : dateStr)}
            >
              <span className="cal-day-num">{day}</span>
              {dayIncome > 0 && <span className="cal-amount cal-income-amt">+{fmtNum(dayIncome)}</span>}
              {dayExpense > 0 && <span className="cal-amount cal-expense-amt">-{fmtNum(dayExpense)}</span>}
            </div>
          )
        })}
      </div>

      {selectedDate && (
        <div className="cal-day-section">
          <div className="cal-day-header">
            <span className="cal-day-title">{formatDate(selectedDate)}</span>
            <div className="cal-day-amounts">
              {selectedIncome > 0 && (
                <span className="cal-day-amt-item">
                  <span className="cal-day-amt-label">수입</span>
                  <span className="cal-income-amt">{fmtWon(selectedIncome)}</span>
                </span>
              )}
              {selectedExpense > 0 && (
                <span className="cal-day-amt-item">
                  <span className="cal-day-amt-label">지출</span>
                  <span className="cal-expense-amt">{fmtWon(selectedExpense)}</span>
                </span>
              )}
            </div>
          </div>
          <div className="cal-day-add-row">
            <button className="cal-add-btn btn-income" onClick={() => onAddIncome(selectedDate)}>+ 수입</button>
            <button className="cal-add-btn btn-expense" onClick={() => onAddExpense(selectedDate)}>+ 지출</button>
          </div>
          {selectedItems.length > 0 && (
            [...selectedItems]
              .sort((a, b) => (a.type === 'income' ? -1 : 1) - (b.type === 'income' ? -1 : 1))
              .map(item => {
                const isIncome = item.type === 'income'
                const m = item.paymentMethod ? getMethod(item.paymentMethod) : undefined
                return (
                  <div
                    key={item.id}
                    className="cal-item"
                    onClick={() => {
                      const r = item.recurringId && recurringIncome.find(i => i.id === item.recurringId)
                      if (r) onEditRecurringIncome(r)
                      else onEditEntry(item)
                    }}
                  >
                    <div className="cal-item-icon">
                      <span className="cal-item-dot" style={{ background: isIncome ? 'var(--income)' : (m?.color ?? 'var(--text-dim)') }} />
                    </div>
                    <div className="cal-item-info">
                      <span className="cal-item-label">{item.label}</span>
                      <span className="cal-item-sub">{item.recurringId ? '매월' : isIncome ? '수입' : (m?.label ?? '')}</span>
                    </div>
                    <span className={`cal-item-amount ${isIncome ? 'cal-income-amt' : 'cal-expense-amt'}`}>{fmtWon(item.amount)}</span>
                  </div>
                )
              })
          )}
        </div>
      )}
    </div>
  )
}
