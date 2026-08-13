import { useState } from 'react'
import Modal from '../Modal'
import type { Expense } from '../../types'

interface Props {
  expense?: Expense
  yearMonth: string
  initialDate?: string
  onSave: (data: Omit<Expense, 'id' | 'uid'>) => void
  onDelete?: () => void
  onClose: () => void
}

export default function IncomeEntryModal({ expense, yearMonth, initialDate, onSave, onDelete, onClose }: Props) {
  const today = new Date().toISOString().slice(0, 10)
  const defaultDate = initialDate ?? (today.startsWith(yearMonth) ? today : `${yearMonth}-01`)

  const [label, setLabel] = useState(expense?.label ?? '')
  const [amount, setAmount] = useState(expense?.amount?.toString() ?? '')
  const [date, setDate] = useState(expense?.date ?? defaultDate)

  const handleSave = () => {
    if (!label.trim() || Number(amount) <= 0) return
    onSave({ yearMonth, label: label.trim(), amount: Number(amount), paymentMethod: '', date, type: 'income' })
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal" onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing && (e.target as HTMLElement).tagName !== 'BUTTON') handleSave() }}>
        <div className="modal-header">
          <h3>{expense ? '수입 수정' : '수입 추가'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>금액 <span className="required">*</span></label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" min={0} autoFocus />
          </div>
          <div className="form-group">
            <label>날짜 <span className="required">*</span></label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={today} />
          </div>
          <div className="form-group">
            <label>내용 <span className="required">*</span></label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="내용 입력" />
          </div>
          {expense && onDelete && (
            <button className="modal-delete-link" onClick={() => { if (confirm('삭제할까요?')) onDelete() }}>항목 삭제</button>
          )}
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!label.trim() || Number(amount) <= 0 || !date}>저장</button>
        </div>
      </div>
    </Modal>
  )
}
