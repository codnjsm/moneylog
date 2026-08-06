import { useRef, useState } from 'react'
import Modal from '../Modal'
import type { CategoryDef } from '../../types'
import { DEFAULT_CATEGORIES, METHOD_COLORS } from '../../types'

interface Props {
  categories: CategoryDef[]
  onSave: (categories: CategoryDef[]) => void
  onClose: () => void
}

export default function CategoryModal({ categories, onSave, onClose }: Props) {
  const [items, setItems] = useState<CategoryDef[]>(() =>
    categories.map((c, i) => ({ ...c, color: c.color ?? METHOD_COLORS[i % METHOD_COLORS.length] }))
  )
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const rowRefs = useRef<(HTMLDivElement | null)[]>([])
  const draggingIndexRef = useRef<number | null>(null)

  const update = (id: string, changes: Partial<CategoryDef>) =>
    setItems(prev => prev.map(c => c.id === id ? { ...c, ...changes } : c))

  const remove = (id: string) => setItems(prev => prev.filter(c => c.id !== id))

  const handleDragStart = (e: React.PointerEvent, index: number, id: string) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    draggingIndexRef.current = index
    setDraggingId(id)
  }

  const handleDragMove = (e: React.PointerEvent) => {
    const from = draggingIndexRef.current
    if (from === null) return
    const rows = rowRefs.current
    let to = from
    for (let i = 0; i < rows.length; i++) {
      const rect = rows[i]?.getBoundingClientRect()
      if (rect && e.clientY >= rect.top && e.clientY <= rect.bottom) { to = i; break }
    }
    if (to !== from) {
      setItems(prev => {
        const next = [...prev]
        const [moved] = next.splice(from, 1)
        next.splice(to, 0, moved)
        return next
      })
      draggingIndexRef.current = to
    }
  }

  const handleDragEnd = () => {
    draggingIndexRef.current = null
    setDraggingId(null)
  }

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
          <h3>카테고리 관리</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {items.map((c, i) => (
            <div
              key={c.id}
              ref={el => { rowRefs.current[i] = el }}
              className={`pm-row${draggingId === c.id ? ' dragging' : ''}`}
            >
              <button
                type="button"
                className="pm-drag-handle"
                onPointerDown={e => handleDragStart(e, i, c.id)}
                onPointerMove={handleDragMove}
                onPointerUp={handleDragEnd}
                onPointerCancel={handleDragEnd}
                title="드래그해서 순서 변경"
              >
                ⠿
              </button>
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
                placeholder="카테고리 이름"
              />
              <button type="button" className="pm-delete-btn" onClick={() => remove(c.id)}>✕</button>
            </div>
          ))}
          <button type="button" className="pm-add-btn" onClick={addItem}>+ 카테고리 추가</button>
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={() => setItems([...DEFAULT_CATEGORIES])} style={{ marginRight: 'auto', fontSize: 12 }}>초기화</button>
          <button className="btn btn-secondary" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={items.filter(c => c.label.trim()).length === 0}>저장</button>
        </div>
      </div>
    </Modal>
  )
}
