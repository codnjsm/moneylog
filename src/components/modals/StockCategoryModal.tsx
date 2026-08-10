import { useState } from 'react'
import Modal from '../Modal'
import type { StockCategoryDef } from '../../types'
import { DEFAULT_STOCK_CATEGORIES, METHOD_COLORS } from '../../types'

interface Props {
  categories: StockCategoryDef[]
  onSave: (categories: StockCategoryDef[]) => void
  onClose: () => void
}

export default function StockCategoryModal({ categories, onSave, onClose }: Props) {
  const [items, setItems] = useState<StockCategoryDef[]>(categories)

  const update = (id: string, changes: Partial<StockCategoryDef>) =>
    setItems(prev => prev.map(c => c.id === id ? { ...c, ...changes } : c))

  const remove = (id: string) => setItems(prev => prev.filter(c => c.id !== id))

  const addItem = () => {
    const usedColors = new Set(items.map(c => c.color))
    const color = METHOD_COLORS.find(c => !usedColors.has(c)) ?? METHOD_COLORS[0]
    setItems(prev => [...prev, { id: Date.now().toString(), label: '', color }])
  }

  const cycleColor = (id: string, current: string) => {
    const idx = METHOD_COLORS.indexOf(current)
    update(id, { color: METHOD_COLORS[(idx + 1) % METHOD_COLORS.length] })
  }

  const handleSave = () => {
    const valid = items.filter(c => c.label.trim())
    if (valid.length === 0) return
    onSave(valid.map(c => ({ ...c, label: c.label.trim() })))
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal">
        <div className="modal-header">
          <h3>구분 관리</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {items.map((c) => (
            <div key={c.id} className="pm-row">
              <button
                type="button"
                className="pm-color-btn"
                style={{ background: c.color }}
                onClick={() => cycleColor(c.id, c.color)}
                title="탭해서 색상 변경"
              />
              <input
                value={c.label}
                onChange={e => update(c.id, { label: e.target.value })}
                placeholder="구분 이름"
              />
              <button type="button" className="pm-delete-btn" onClick={() => remove(c.id)}>✕</button>
            </div>
          ))}
          <button type="button" className="pm-add-btn" onClick={addItem}>+ 구분 추가</button>
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={() => setItems([...DEFAULT_STOCK_CATEGORIES])} style={{ marginRight: 'auto', fontSize: 12 }}>초기화</button>
          <button className="btn btn-secondary" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={items.filter(c => c.label.trim()).length === 0}>저장</button>
        </div>
      </div>
    </Modal>
  )
}
