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

  // 바깥을 눌러도 닫지 않는다. 입력하다 잘못 누르면 적어둔 내용이 통째로 사라지는데,
  // 되돌릴 방법이 없어서 얻는 편의보다 잃는 쪽이 크다. 닫기는 X 버튼과 ESC 로만 한다.
  return (
    <div className="modal-overlay">
      {children}
    </div>
  )
}
