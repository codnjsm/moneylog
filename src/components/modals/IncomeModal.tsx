import { useState } from 'react'
import Modal from '../Modal'
import type { IncomeItem } from '../../types'

interface Props {
  items: IncomeItem[]
  onSave: (items: IncomeItem[]) => void
  onClose: () => void
}

let nextId = Date.now()

export default function IncomeModal({ items, onSave, onClose }: Props) {
  const [entries, setEntries] = useState<IncomeItem[]>(
    items.length > 0 ? [...items] : [{ id: String(nextId++), label: '', amount: 0 }]
  )

  const update = (i: number, field: keyof IncomeItem, value: string) =>
    setEntries((prev) => prev.map((e, idx) => idx === i ? { ...e, [field]: field === 'amount' ? Number(value) : value } : e))

  const add = () => setEntries((prev) => [...prev, { id: String(nextId++), label: '', amount: 0 }])
  const remove = (i: number) => setEntries((prev) => prev.filter((_, idx) => idx !== i))

  const handleSave = () => {
    const valid = entries.filter((e) => e.label.trim() && e.amount > 0)
    onSave(valid)
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal" onKeyDown={e => { if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'BUTTON') handleSave() }}>
        <div className="modal-header">
          <h3>수입 편집</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {entries.map((e, i) => (
            <div key={e.id} className="form-row">
              <div className="form-group" style={{ flex: 2 }}>
                {i === 0 && <label>항목</label>}
                <input value={e.label} onChange={(ev) => update(i, 'label', ev.target.value)} placeholder="급여, 부수입 등" />
              </div>
              <div className="form-group" style={{ flex: 2 }}>
                {i === 0 && <label>금액</label>}
                <input type="number" value={e.amount || ''} onChange={(ev) => update(i, 'amount', ev.target.value)} placeholder="0" min={0} />
              </div>
              <div className="form-group" style={{ flex: 'none' }}>
                {i === 0 && <label style={{ visibility: 'hidden' }}>-</label>}
                <button className="btn btn-ghost" onClick={() => remove(i)} style={{ padding: '9px 0px', border: 'none' }}>✕</button>
              </div>
            </div>
          ))}
          <button className="btn btn-secondary" onClick={add} style={{ marginTop: 4 }}>+ 항목 추가</button>
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={handleSave}>저장</button>
        </div>
      </div>
    </Modal>
  )
}
