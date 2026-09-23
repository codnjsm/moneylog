import { useState } from 'react'
import Modal from '../Modal'
import type { SavingsItem } from '../../types'
import { useSaveGuard } from '../../hooks/useSaveGuard'

interface Props {
  item?: SavingsItem
  onSave: (data: Omit<SavingsItem, 'id' | 'uid'>) => void | Promise<void>
  onDelete?: () => void
  onClose: () => void
}

export default function SavingsItemModal({ item, onSave, onDelete, onClose }: Props) {
  const [label, setLabel] = useState(item?.label ?? '')
  const [amount, setAmount] = useState(item?.amount?.toString() ?? '')
  const [paymentDay, setPaymentDay] = useState(item?.paymentDay?.toString() ?? '')
  const [maturityDate, setMaturityDate] = useState(item?.maturityDate ?? '')

  const { saving, runSave } = useSaveGuard()

  const handleSave = () => {
    if (!label.trim() || Number(amount) <= 0) return
    runSave(() => onSave({
      label: label.trim(),
      amount: Number(amount),
      paymentDay: paymentDay ? Number(paymentDay) : undefined,
      maturityDate: maturityDate || undefined,
    }))
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal">
        <div className="modal-header">
          <h3>{item ? '적금 수정' : '적금 추가'}</h3>
          <button className="modal-close" onClick={onClose} aria-label="닫기">✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="savings-item-label">항목 <span className="required">*</span></label>
            <input id="savings-item-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="청년도약계좌, ISA 등" autoFocus />
          </div>
          <div className="form-group">
            <label htmlFor="savings-item-amount">월 납입액 <span className="required">*</span></label>
            <input id="savings-item-amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" min={0} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="savings-item-day">납입일</label>
              <input id="savings-item-day" type="number" value={paymentDay} onChange={(e) => setPaymentDay(e.target.value)} placeholder="매월 N일" min={1} max={31} />
            </div>
            <div className="form-group">
              <label htmlFor="savings-item-maturity">만기일</label>
              <input id="savings-item-maturity" type="date" value={maturityDate} onChange={(e) => setMaturityDate(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="modal-actions">
          {item && onDelete && (
            <button className="btn btn-danger" onClick={() => { if (confirm('삭제할까요?')) onDelete() }} disabled={saving} style={{ marginRight: 'auto' }}>삭제</button>
          )}
          <button className="btn btn-secondary" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !label.trim() || Number(amount) <= 0}>{saving ? '저장 중…' : '저장'}</button>
        </div>
      </div>
    </Modal>
  )
}
