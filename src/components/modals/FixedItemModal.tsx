import { useState } from 'react'
import Modal from '../Modal'
import type { FixedItem } from '../../types'
import { useSaveGuard } from '../../hooks/useSaveGuard'

interface Props {
  item?: FixedItem
  onSave: (data: Omit<FixedItem, 'id' | 'uid'>) => void | Promise<void>
  onDelete?: () => void
  onClose: () => void
}

export default function FixedItemModal({ item, onSave, onDelete, onClose }: Props) {
  const [label, setLabel] = useState(item?.label ?? '')
  const [amount, setAmount] = useState(item?.amount?.toString() ?? '')

  const { saving, runSave } = useSaveGuard()

  const handleSave = () => {
    if (!label.trim() || Number(amount) <= 0) return
    runSave(() => onSave({ label: label.trim(), amount: Number(amount), order: item?.order ?? 0 }))
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal">
        <div className="modal-header">
          <h3>{item ? '고정 지출 수정' : '고정 지출 추가'}</h3>
          <button className="modal-close" onClick={onClose} aria-label="닫기">✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="fixed-item-label">항목 <span className="required">*</span></label>
            <input id="fixed-item-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="보험, 통신비 등" autoFocus />
          </div>
          <div className="form-group">
            <label htmlFor="fixed-item-amount">금액 <span className="required">*</span></label>
            <input id="fixed-item-amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" min={0} />
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
