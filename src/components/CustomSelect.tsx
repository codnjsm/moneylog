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
  // 열었을 때는 스크롤바를 띄워 두고, 한 번 굴리고 나면 숨긴다.
  const [scrollIdle, setScrollIdle] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  // 아래의 '고른 항목으로 맞추기'가 일으킨 scroll 이벤트를 사용자 스크롤로 세지 않기 위한 표시
  const skipScroll = useRef(false)
  const idleTimer = useRef<number | undefined>(undefined)

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
    if (!sel) return
    const target = Math.max(0, sel.offsetTop - list.clientHeight / 2 + sel.clientHeight / 2)
    // 실제로 움직일 때만 표시를 세운다. 0 이면 scroll 이벤트가 안 나서 표시가 남고,
    // 그러면 사용자의 첫 스크롤을 대신 삼켜버린다.
    if (target > 0) {
      skipScroll.current = true
      list.scrollTop = target
    }
  }, [open])

  useEffect(() => () => clearTimeout(idleTimer.current), [])

  const handleScroll = () => {
    if (skipScroll.current) { skipScroll.current = false; return }
    if (scrollIdle) return
    clearTimeout(idleTimer.current)
    // 굴리는 동안은 보이게 두고, 손을 뗀 뒤에 사라지게 한다.
    idleTimer.current = setTimeout(() => setScrollIdle(true), 600)
  }

  const selectedLabel = options.find(o => o.value === value)?.label ?? value

  return (
    <div className="custom-select-wrap" ref={ref}>
      <button
        className="custom-select-btn"
        type="button"
        onClick={() => { setOpen(o => !o); setScrollIdle(false); clearTimeout(idleTimer.current) }}
        aria-label={name ? `${name}: ${selectedLabel}` : undefined}
        aria-expanded={open}
      >
        <span>{selectedLabel}</span>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="custom-select-chevron" aria-hidden="true">
          <path d="M3 5l4 4 4-4"/>
        </svg>
      </button>
      {open && (
        <div className={`custom-select-dropdown${scrollIdle ? ' scroll-idle' : ''}`} ref={listRef} onScroll={handleScroll}>
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
