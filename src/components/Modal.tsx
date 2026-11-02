import { useEffect, useRef, type ReactNode } from 'react'

interface Props { onClose: () => void; children: ReactNode }

export default function Modal({ onClose, children }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)

  // 오버레이는 fixed 라 레이아웃 뷰포트 기준인데, 키보드가 올라와도 그건 줄지 않는다.
  // 그래서 보이는 영역(visualViewport)에 직접 맞춰주지 않으면 바텀시트가 키보드 뒤로 들어간다.
  useEffect(() => {
    const vv = window.visualViewport
    const el = overlayRef.current
    if (!vv || !el) return

    const fit = () => {
      el.style.height = `${vv.height}px`
      el.style.top = `${vv.offsetTop}px`
      el.style.bottom = 'auto'
    }
    fit()

    vv.addEventListener('resize', fit)
    vv.addEventListener('scroll', fit)
    return () => {
      vv.removeEventListener('resize', fit)
      vv.removeEventListener('scroll', fit)
    }
  }, [])

  // 고정 오버레이 안이라 브라우저가 포커스된 입력칸을 알아서 올려주지 못한다.
  // 키보드가 올라와 보이는 영역이 줄어든 뒤에 불러야 제자리로 가므로 한 박자 늦춘다.
  // nearest 라서 이미 다 보이는 칸은 건드리지 않는다.
  useEffect(() => {
    const el = overlayRef.current
    if (!el) return

    let timer: number
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target
      if (!(target instanceof HTMLElement)) return
      clearTimeout(timer)
      timer = setTimeout(() => target.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 300)
    }

    el.addEventListener('focusin', onFocusIn)
    return () => {
      clearTimeout(timer)
      el.removeEventListener('focusin', onFocusIn)
    }
  }, [])

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
    <div className="modal-overlay" ref={overlayRef}>
      {children}
    </div>
  )
}
