import { useState } from 'react'
import Modal from '../Modal'
import CustomSelect from '../CustomSelect'
import type { Expense, PaymentMethodDef, CategoryDef } from '../../types'

interface Props {
  expense?: Expense
  yearMonth: string
  initialDate?: string
  methods: PaymentMethodDef[]
  categories: CategoryDef[]
  onSave: (items: Omit<Expense, 'id' | 'uid'>[]) => void
  onDelete?: () => void
  onDeleteGroup?: () => void
  onClose: () => void
}

function addMonths(dateStr: string, n: number): { date: string; yearMonth: string } {
  const [y, m, d] = dateStr.split('-').map(Number)
  let totalMonth = (m - 1) + n
  const newYear = y + Math.floor(totalMonth / 12)
  const newMonth = totalMonth % 12
  const lastDay = new Date(newYear, newMonth + 1, 0).getDate()
  const newDay = Math.min(d, lastDay)
  const date = `${newYear}-${String(newMonth + 1).padStart(2, '0')}-${String(newDay).padStart(2, '0')}`
  return { date, yearMonth: date.slice(0, 7) }
}

export default function ExpenseModal({ expense, yearMonth, initialDate, methods, categories, onSave, onDelete, onDeleteGroup, onClose }: Props) {
  const today = new Date().toISOString().slice(0, 10)
  const defaultDate = initialDate ?? (today.startsWith(yearMonth) ? today : `${yearMonth}-01`)

  const [label, setLabel] = useState(expense?.label ?? '')
  const [amount, setAmount] = useState(expense?.amount?.toString() ?? '')
  const [method, setMethod] = useState(expense?.paymentMethod ?? methods[0]?.id ?? '')
  const [date, setDate] = useState(expense?.date ?? defaultDate)
  const [category, setCategory] = useState(expense?.category ?? '')
  const [installments, setInstallments] = useState(1)

  const isEdit = !!expense
  const totalAmount = Number(amount) || 0
  const monthlyAmount = installments > 1 ? Math.floor(totalAmount / installments) : totalAmount

  const handleSave = () => {
    if (!label.trim() || !amount || !method) return

    if (installments <= 1 || isEdit) {
      const data: Omit<Expense, 'id' | 'uid'> = {
        yearMonth: expense?.yearMonth ?? yearMonth,
        label: label.trim(),
        amount: totalAmount,
        paymentMethod: method,
        date,
        type: 'expense',
      }
      if (category) data.category = category
      onSave([data])
      return
    }

    const groupId = Date.now().toString(36) + Math.random().toString(36).slice(2)
    const items: Omit<Expense, 'id' | 'uid'>[] = []
    for (let i = 0; i < installments; i++) {
      const { date: iDate, yearMonth: iYearMonth } = addMonths(date, i)
      const isLast = i === installments - 1
      const iAmount = isLast ? totalAmount - monthlyAmount * (installments - 1) : monthlyAmount
      const item: Omit<Expense, 'id' | 'uid'> = {
        yearMonth: iYearMonth,
        label: `${label.trim()} (${i + 1}/${installments})`,
        amount: iAmount,
        paymentMethod: method,
        date: iDate,
        type: 'expense',
        installmentGroupId: groupId,
      }
      if (category) item.category = category
      items.push(item)
    }
    onSave(items)
  }

  const installmentOptions = [
    { value: '1', label: '일시불' },
    ...Array.from({ length: 11 }, (_, i) => ({ value: String(i + 2), label: `${i + 2}개월` })),
  ]

  return (
    <Modal onClose={onClose}>
      <div className="modal" onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing && (e.target as HTMLElement).tagName !== 'TEXTAREA' && (e.target as HTMLElement).tagName !== 'BUTTON') handleSave() }}>
        <div className="modal-header">
          <h3>{expense ? '지출 수정' : '지출 추가'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>카테고리</label>
            <CustomSelect
              value={category}
              options={[{ value: '', label: '없음' }, ...categories.map(c => ({ value: c.id, label: c.label }))]}
              onChange={setCategory}
            />
          </div>

          <div className="form-group">
            <label>금액 <span className="required">*</span></label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              min={0}
              autoFocus
            />
          </div>

          {!isEdit && (
            <div className="form-group">
              <label>할부</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CustomSelect
                  value={String(installments)}
                  options={installmentOptions}
                  onChange={(v) => setInstallments(Number(v))}
                />
                {installments > 1 && totalAmount > 0 && (
                  <span style={{ fontSize: '13px', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                    월 {monthlyAmount.toLocaleString()}원
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="form-group">
            <label>날짜 <span className="required">*</span></label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={today} />
          </div>

          <div className="form-group">
            <label>결제 수단</label>
            <CustomSelect
              value={method}
              options={methods.map(m => ({ value: m.id, label: m.label }))}
              onChange={setMethod}
            />
          </div>

          <div className="form-group">
            <label>내용 <span className="required">*</span></label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="내용 입력" />
          </div>

          {expense && onDelete && (
            <button className="modal-delete-link" onClick={() => { if (confirm('이 항목만 삭제할까요?')) onDelete() }}>이 항목만 삭제</button>
          )}
          {expense && onDeleteGroup && (
            <button className="modal-delete-link" onClick={() => { if (confirm('할부 전체를 삭제할까요?')) onDeleteGroup() }}>할부 전체 삭제</button>
          )}
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!label.trim() || !amount || !method || !date}>저장</button>
        </div>
      </div>
    </Modal>
  )
}
