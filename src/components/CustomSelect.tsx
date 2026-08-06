import { useState, useEffect, useRef } from 'react'

interface Option {
  value: string
  label: string
}

interface Props {
  value: string
  options: Option[]
  onChange: (value: string) => void
  action?: { label: string; onClick: () => void }
}

export default function CustomSelect({ value, options, onChange, action }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const selectedLabel = options.find(o => o.value === value)?.label ?? value

  return (
    <div className="custom-select-wrap" ref={ref}>
      <button className="custom-select-btn" type="button" onClick={() => setOpen(o => !o)}>
        <span>{selectedLabel}</span>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="custom-select-chevron">
          <path d="M3 5l4 4 4-4"/>
        </svg>
      </button>
      {open && (
        <div className="custom-select-dropdown">
          {options.map(o => (
            <button
              key={o.value}
              type="button"
              className={`custom-select-option${value === o.value ? ' selected' : ''}`}
              onClick={() => { onChange(o.value); setOpen(false) }}
            >
              {o.label}
            </button>
          ))}
          {action && (
            <button
              type="button"
              className="custom-select-action"
              onClick={() => { action.onClick(); setOpen(false) }}
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
