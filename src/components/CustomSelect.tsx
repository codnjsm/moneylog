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
  /** 옆의 <label> 을 htmlFor 로 연결할 수 없어서, 대신 읽어줄 이름을 받는다 */
  name?: string
}

export default function CustomSelect({ value, options, onChange, action, name }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLSpanElement>(null)
  const barRef = useRef<HTMLSpanElement>(null)

  // iOS 는 ::-webkit-scrollbar 를 무시해 네이티브 인디케이터의 두께도 둥글기도 바꿀 수 없다.
  // 그래서 네이티브는 숨기고 막대를 직접 그린다. 길이는 보이는 비율, 위치는 스크롤 비율이다.
  // state 가 아니라 style 을 직접 만지는 이유는, 스크롤할 때마다 목록 전체를 다시 그리지 않기 위해서다.
  const drawBar = () => {
    const list = listRef.current, track = trackRef.current, bar = barRef.current
    if (!list || !track || !bar) return
    const { scrollHeight, clientHeight, scrollTop } = list
    if (scrollHeight - clientHeight < 2) { track.style.display = 'none'; return }
    track.style.display = ''
    const trackH = track.clientHeight
    const h = Math.max(28, Math.round((trackH * clientHeight) / scrollHeight))
    const y = Math.round(((trackH - h) * scrollTop) / (scrollHeight - clientHeight))
    bar.style.height = `${h}px`
    bar.style.transform = `translateY(${y}px)`
  }

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // 목록이 max-height 를 넘으면 고른 항목이 접힌 부분에 있을 수 있다. 열 때 가운데로 맞춘다.
  // scrollIntoView 대신 목록의 scrollTop 을 직접 만지는 이유는, 모달 안에서 쓰일 때
  // 바깥 스크롤 컨테이너(.modal-body)까지 같이 움직이는 것을 막기 위해서다.
  useEffect(() => {
    const list = listRef.current
    if (!open || !list) return
    const sel = list.querySelector<HTMLElement>('.custom-select-option.selected')
    if (sel) list.scrollTop = sel.offsetTop - list.clientHeight / 2 + sel.clientHeight / 2
    drawBar()
  }, [open])

  const selectedLabel = options.find(o => o.value === value)?.label ?? value

  return (
    <div className="custom-select-wrap" ref={ref}>
      <button
        className="custom-select-btn"
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label={name ? `${name}: ${selectedLabel}` : undefined}
        aria-expanded={open}
      >
        <span>{selectedLabel}</span>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="custom-select-chevron" aria-hidden="true">
          <path d="M3 5l4 4 4-4"/>
        </svg>
      </button>
      {open && (
        <div className="custom-select-dropdown">
          <div className="custom-select-list" ref={listRef} onScroll={drawBar}>
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
          <span className="custom-select-track" ref={trackRef} aria-hidden="true">
            <span className="custom-select-bar" ref={barRef} />
          </span>
        </div>
      )}
    </div>
  )
}
