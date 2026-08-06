import { useEffect, type ReactNode } from 'react'

interface Props { onClose: () => void; children: ReactNode }

export default function Modal({ onClose, children }: Props) {
  useEffect(() => {
    const scrollY = window.scrollY
    const { body } = document
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.overflow = 'hidden'

    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
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
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      {children}
    </div>
  )
}
