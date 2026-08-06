import { useState } from 'react'
import Modal from '../Modal'
import type { PaymentMethodDef } from '../../types'
import { METHOD_COLORS, DEFAULT_PAYMENT_METHODS } from '../../types'

interface Props {
  methods: PaymentMethodDef[]
  onSave: (methods: PaymentMethodDef[]) => void
  onClose: () => void
}

export default function PaymentLabelsModal({ methods, onSave, onClose }: Props) {
  const [items, setItems] = useState<PaymentMethodDef[]>([...methods])

  const update = (id: string, changes: Partial<PaymentMethodDef>) =>
    setItems(prev => prev.map(m => m.id === id ? { ...m, ...changes } : m))

  const remove = (id: string) => setItems(prev => prev.filter(m => m.id !== id))

  const addItem = () => {
    const usedColors = new Set(items.map(m => m.color))
    const color = METHOD_COLORS.find(c => !usedColors.has(c)) ?? METHOD_COLORS[0]
    setItems(prev => [...prev, { id: Date.now().toString(), label: '', color }])
  }

  const cycleColor = (id: string, current: string) => {
    const idx = METHOD_COLORS.indexOf(current)
    update(id, { color: METHOD_COLORS[(idx + 1) % METHOD_COLORS.length] })
  }

  const handleSave = () => {
    const valid = items.filter(m => m.label.trim())
    if (valid.length === 0) return
    onSave(valid.map(m => ({ ...m, label: m.label.trim() })))
  }

  const handleReset = () => setItems([...DEFAULT_PAYMENT_METHODS])

  return (
    <Modal onClose={onClose}>
      <div className="modal">
        <div className="modal-header">
          <h3>결제 수단 관리</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {items.map((m) => (
            <div key={m.id} className="pm-row">
              <button
                type="button"
                className="pm-color-btn"
                style={{ background: m.color }}
                onClick={() => cycleColor(m.id, m.color)}
                title="탭해서 색상 변경"
              />
              <input
                value={m.label}
                onChange={e => update(m.id, { label: e.target.value })}
                placeholder="수단 이름"
              />
              <button type="button" className="pm-delete-btn" onClick={() => remove(m.id)}>✕</button>
            </div>
          ))}
          <button type="button" className="pm-add-btn" onClick={addItem}>+ 수단 추가</button>
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={handleReset} style={{ marginRight: 'auto', fontSize: 12 }}>초기화</button>
          <button className="btn btn-secondary" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={items.filter(m => m.label.trim()).length === 0}>저장</button>
        </div>
      </div>
    </Modal>
  )
}
