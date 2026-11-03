import { useState } from 'react'
import Modal from '../Modal'
import type { Expense, IncomeItem } from '../../types'
import { useSaveGuard } from '../../hooks/useSaveGuard'

interface Props {
  /** 일시 수입을 고칠 때 */
  expense?: Expense
  /** 반복 수입을 고칠 때 */
  recurring?: IncomeItem
  yearMonth: string
  initialDate?: string
  onSaveOnce: (data: Omit<Expense, 'id' | 'uid'>) => void | Promise<void>
  onSaveRecurring: (item: IncomeItem) => void | Promise<void>
  onDelete?: () => void
  onClose: () => void
}

export default function IncomeEntryModal({ expense, recurring, yearMonth, initialDate, onSaveOnce, onSaveRecurring, onDelete, onClose }: Props) {
  const today = new Date().toISOString().slice(0, 10)
  const defaultDate = initialDate ?? (today.startsWith(yearMonth) ? today : `${yearMonth}-01`)
  const isEdit = !!(expense || recurring)

  // 수정할 때는 종류를 못 바꾼다. 반복↔일시 전환은 저장 위치가 달라 지웠다 다시 만드는 일이라,
  // 조용히 처리하면 어느 달까지 영향이 가는지 알기 어렵다. 바꾸려면 지우고 새로 적는다.
  const [recurringMode, setRecurringMode] = useState(!!recurring)

  const [label, setLabel] = useState(expense?.label ?? recurring?.label ?? '')
  const [amount, setAmount] = useState((expense?.amount ?? recurring?.amount)?.toString() ?? '')
  const [date, setDate] = useState(expense?.date ?? defaultDate)
  const [day, setDay] = useState((recurring?.paymentDay ?? Number(defaultDate.slice(8, 10))).toString())

  const { saving, runSave } = useSaveGuard()

  const dayNum = Number(day)
  const dayValid = Number.isInteger(dayNum) && dayNum >= 1 && dayNum <= 31
  const canSave = !!label.trim() && Number(amount) > 0 && (recurringMode ? dayValid : !!date)

  const handleSave = () => {
    if (!canSave) return
    if (recurringMode) {
      runSave(() => onSaveRecurring({
        id: recurring?.id ?? Date.now().toString(36) + Math.random().toString(36).slice(2),
        label: label.trim(),
        amount: Number(amount),
        paymentDay: dayNum,
      }))
      return
    }
    // 집계 달은 고른 날짜에서 뽑는다 (ExpenseModal 과 같은 규칙).
    runSave(() => onSaveOnce({ yearMonth: date.slice(0, 7), label: label.trim(), amount: Number(amount), paymentMethod: '', date, type: 'income' }))
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal" onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing && (e.target as HTMLElement).tagName !== 'BUTTON') handleSave() }}>
        <div className="modal-header">
          <h3>{isEdit ? '수입 수정' : '수입 추가'}</h3>
          <button className="modal-close" onClick={onClose} aria-label="닫기">✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>종류</label>
            <div className="mode-toggle" role="group" aria-label="수입 종류">
              <button
                className={`mode-btn${!recurringMode ? ' active' : ''}`}
                onClick={() => setRecurringMode(false)}
                disabled={isEdit}
              >
                이번만
              </button>
              <button
                className={`mode-btn${recurringMode ? ' active' : ''}`}
                onClick={() => setRecurringMode(true)}
                disabled={isEdit}
              >
                매달 반복
              </button>
            </div>
            <p className="form-hint">
              {recurringMode
                ? '다음 달부터도 자동으로 이어져요. 금액을 바꾸면 그 달부터 바뀌고 지난 달은 그대로예요.'
                : '이 달에만 기록돼요.'}
            </p>
          </div>
          <div className="form-group">
            <label htmlFor="income-entry-amount">금액 <span className="required">*</span></label>
            <input id="income-entry-amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" min={0} autoFocus />
          </div>
          {recurringMode ? (
            <div className="form-group">
              <label htmlFor="income-entry-day">들어오는 날 <span className="required">*</span></label>
              <div className="form-row">
                <span className="form-prefix">매월</span>
                <input id="income-entry-day" type="number" value={day} onChange={(e) => setDay(e.target.value)} placeholder="25" min={1} max={31} />
                <span className="form-prefix">일</span>
              </div>
            </div>
          ) : (
            <div className="form-group">
              <label htmlFor="income-entry-date">날짜 <span className="required">*</span></label>
              <input id="income-entry-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          )}
          <div className="form-group">
            <label htmlFor="income-entry-label">내용 <span className="required">*</span></label>
            <input id="income-entry-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="내용 입력" />
          </div>
          {isEdit && onDelete && (
            <button className="modal-delete-link" onClick={() => { if (confirm(recurring ? '이 달부터 지울까요? 지난 달은 그대로예요.' : '삭제할까요?')) onDelete() }} disabled={saving}>항목 삭제</button>
          )}
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !canSave}>{saving ? '저장 중…' : '저장'}</button>
        </div>
      </div>
    </Modal>
  )
}
