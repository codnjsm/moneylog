import { useEffect, useState } from 'react'

interface Props {
  onAddIncome: () => void
  onAddExpense: () => void
}

/** 아이콘은 탭바(TabIcon)와 같은 규격으로 맞춘다. */
const common = {
  width: 20,
  height: 20,
  viewBox: '0 0 22 22',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export default function HomeFab({ onAddIncome, onAddExpense }: Props) {
  const [open, setOpen] = useState(false)

  const run = (fn: () => void) => {
    setOpen(false)
    fn()
  }

  useEffect(() => {
    if (!open) return

    // Modal.tsx 와 같은 방식. 어두운 배경이 화면을 덮는 동안 뒤가 움직이면 안 된다.
    const scrollY = window.scrollY
    const { body } = document
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.overflow = 'hidden'

    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)

    return () => {
      body.style.position = ''
      body.style.top = ''
      body.style.left = ''
      body.style.right = ''
      body.style.overflow = ''
      window.scrollTo(0, scrollY)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <>
      {/* 모달과 달리 바깥을 누르면 닫는다. 아직 적은 내용이 없어서 잃을 게 없다. */}
      {open && <div className="fab-backdrop" onClick={() => setOpen(false)} />}
      <div className={`fab-stack${open ? ' open' : ''}`}>
        {open && (
          <>
            <button className="fab-action" onClick={() => run(onAddIncome)}>
              <span className="fab-action-label">수입 추가</span>
              <span className="fab-action-icon">
                <svg {...common}><path d="M11 5v12"/><path d="M5 11h12"/></svg>
              </span>
            </button>
            <button className="fab-action" onClick={() => run(onAddExpense)}>
              <span className="fab-action-label">지출 추가</span>
              <span className="fab-action-icon">
                <svg {...common}><path d="M5 11h12"/></svg>
              </span>
            </button>
          </>
        )}
        <button
          className={`fab${open ? ' open' : ''}`}
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? '빠른 추가 닫기' : '빠른 추가'}
          aria-expanded={open}
        >
          +
        </button>
      </div>
    </>
  )
}
