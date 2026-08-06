import { useState } from 'react'
import Modal from '../Modal'
import type { SavingsItem } from '../../types'

interface Props {
  items: SavingsItem[]
  onSave: (items: Array<{ id: string; label: string; amount: number; paymentDay?: number; maturityDate?: string }>) => void
  onClose: () => void
}

type Row = { id: string; label: string; amount: string; paymentDay: string; maturityDate: string }

export default function SavingsListModal({ items, onSave, onClose }: Props) {
  const [rows, setRows] = useState<Row[]>(
    items.length > 0
      ? items.map(i => ({
          id: i.id,
          label: i.label,
          amount: i.amount.toString(),
          paymentDay: i.paymentDay?.toString() ?? '',
          maturityDate: i.maturityDate ?? '',
        }))
      : [{ id: `new-${Date.now()}`, label: '', amount: '', paymentDay: '', maturityDate: '' }]
  )

  const update = (id: string, field: keyof Omit<Row, 'id'>, value: string) =>
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))

  const remove = (id: string) => setRows(prev => prev.filter(r => r.id !== id))

  const add = () => setRows(prev => [...prev, { id: `new-${Date.now()}`, label: '', amount: '', paymentDay: '', maturityDate: '' }])

  const handleSave = () => {
    const valid = rows.filter(r => r.label.trim() && Number(r.amount) > 0)
    onSave(valid.map(r => ({
      id: r.id,
      label: r.label.trim(),
      amount: Number(r.amount),
      ...(r.paymentDay ? { paymentDay: Number(r.paymentDay) } : {}),
      ...(r.maturityDate ? { maturityDate: r.maturityDate } : {}),
    })))
  }

  const canSave = rows.some(r => r.label.trim() && Number(r.amount) > 0)

  return (
    <Modal onClose={onClose}>
      <div className="modal">
        <div className="modal-header">
          <h3>적금 관리</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {rows.map((r) => (
            <div key={r.id} className="savings-card">
              <button className="savings-card-delete" onClick={() => remove(r.id)}>✕</button>
              <div className="form-row" style={{ marginBottom: 8 }}>
                <div className="form-group" style={{ flex: 2 }}>
                  <label>항목</label>
                  <input value={r.label} onChange={e => update(r.id, 'label', e.target.value)} placeholder="청년도약계좌, ISA 등" />
                </div>
                <div className="form-group" style={{ flex: 2 }}>
                  <label>월 납입액</label>
                  <input type="number" value={r.amount} onChange={e => update(r.id, 'amount', e.target.value)} placeholder="0" min={0} />
                </div>
              </div>
              <div className="form-row" style={{ marginTop: 8 }}>
                <div className="form-group">
                  <label>납입일</label>
                  <input type="number" value={r.paymentDay} onChange={e => update(r.id, 'paymentDay', e.target.value)} placeholder="매월 N일" min={1} max={31} />
                </div>
                <div className="form-group">
                  <label>만기일</label>
                  <input type="date" value={r.maturityDate} onChange={e => update(r.id, 'maturityDate', e.target.value)} />
                </div>
              </div>
            </div>
          ))}
          <button className="btn btn-secondary" onClick={add} style={{ marginTop: 4 }}>+ 항목 추가</button>
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!canSave}>저장</button>
        </div>
      </div>
    </Modal>
  )
}
