import { useState } from 'react'
import Modal from '../Modal'
import type { AssetTypeDef } from '../../types'
import { DEFAULT_ASSET_TYPES, METHOD_COLORS } from '../../types'

interface Props {
  assetTypes: AssetTypeDef[]
  onSave: (types: AssetTypeDef[]) => void
  onClose: () => void
}

export default function AssetTypeModal({ assetTypes, onSave, onClose }: Props) {
  const [items, setItems] = useState<AssetTypeDef[]>(assetTypes)

  const update = (id: string, changes: Partial<AssetTypeDef>) =>
    setItems(prev => prev.map(t => t.id === id ? { ...t, ...changes } : t))

  const remove = (id: string) => setItems(prev => prev.filter(t => t.id !== id))

  const addItem = () => {
    const usedColors = new Set(items.map(t => t.color))
    const color = METHOD_COLORS.find(c => !usedColors.has(c)) ?? METHOD_COLORS[0]
    setItems(prev => [...prev, { id: Date.now().toString(), label: '', color }])
  }

  const cycleColor = (id: string, current: string) => {
    const idx = METHOD_COLORS.indexOf(current)
    update(id, { color: METHOD_COLORS[(idx + 1) % METHOD_COLORS.length] })
  }

  const handleSave = () => {
    const valid = items.filter(t => t.label.trim())
    if (valid.length === 0) return
    onSave(valid.map(t => ({ ...t, label: t.label.trim() })))
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal">
        <div className="modal-header">
          <h3>자산 종류 관리</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {items.map((t) => (
            <div key={t.id} className="pm-row">
              <button
                type="button"
                className="pm-color-btn"
                style={{ background: t.color }}
                onClick={() => cycleColor(t.id, t.color)}
                title="탭해서 색상 변경"
              />
              <input
                value={t.label}
                onChange={e => update(t.id, { label: e.target.value })}
                placeholder="종류 이름"
              />
              <button type="button" className="pm-delete-btn" onClick={() => remove(t.id)}>✕</button>
            </div>
          ))}
          <button type="button" className="pm-add-btn" onClick={addItem}>+ 종류 추가</button>
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={() => setItems([...DEFAULT_ASSET_TYPES])} style={{ marginRight: 'auto', fontSize: 12 }}>초기화</button>
          <button className="btn btn-secondary" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={items.filter(t => t.label.trim()).length === 0}>저장</button>
        </div>
      </div>
    </Modal>
  )
}
