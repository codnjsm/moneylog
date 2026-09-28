import { useEffect, useState } from 'react'

export type ToastType = 'success' | 'error' | 'info'
export interface ToastState { msg: string; type: ToastType; key: number }

interface Props {
  /** null 이면 아무것도 그리지 않는다. 표시 수명은 App 이 관리한다. */
  toast: ToastState | null
}

export default function Toast({ toast }: Props) {
  const [visible, setVisible] = useState(false)
  const key = toast?.key

  useEffect(() => {
    if (!key) return
    // 숨은 상태가 한 번 그려진 다음에 보이게 해야 '등장' 전환이 실제로 재생된다.
    // 같은 렌더에서 바로 visible=true 로 두면 전환할 이전 상태가 없어 툭 튀어나온다.
    let enterFrame = 0
    const paintFrame = requestAnimationFrame(() => {
      enterFrame = requestAnimationFrame(() => setVisible(true))
    })
    const hideTimer = setTimeout(() => setVisible(false), 2200)
    return () => {
      cancelAnimationFrame(paintFrame)
      cancelAnimationFrame(enterFrame)
      clearTimeout(hideTimer)
      // 2.2초 안에 다음 토스트가 오면 visible 이 true 로 남아 등장 전환을 건너뛴다 — 여기서 되돌린다
      setVisible(false)
    }
  }, [key])

  if (!toast) return null
  const { msg, type } = toast

  return (
    <div className={`toast${visible ? ' visible' : ''}${type === 'error' ? ' error' : ''}`} role="status">
      {type === 'success' && (
        <span className="toast-icon success" aria-hidden="true">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </span>
      )}
      {type === 'error' && (
        <span className="toast-icon error" aria-hidden="true">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </span>
      )}
      {msg}
    </div>
  )
}
