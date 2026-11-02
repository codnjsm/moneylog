import { useEffect, useRef, type ReactNode } from 'react'

interface Props { onClose: () => void; children: ReactNode }

export default function Modal({ onClose, children }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)

  // 오버레이는 fixed 라 레이아웃 뷰포트 기준인데, 키보드가 올라와도 그건 줄지 않는다.
  // 그래서 보이는 영역(visualViewport)에 맞춰주지 않으면 모달이 키보드 뒤로 들어간다.
  // 크기를 줄이는 대신 가려진 만큼을 패딩으로 주는 이유는, 어두운 배경은 화면 끝까지
  // 덮으면서 모달 위치만 보이는 영역 기준으로 잡히게 하기 위해서다.
  useEffect(() => {
    const vv = window.visualViewport
    const el = overlayRef.current
    if (!vv || !el) return

    const fit = () => {
      const viewport = document.documentElement.clientHeight
      el.style.paddingTop = `${vv.offsetTop}px`
      el.style.paddingBottom = `${Math.max(0, viewport - vv.offsetTop - vv.height)}px`
    }
    fit()

    vv.addEventListener('resize', fit)
    vv.addEventListener('scroll', fit)
    return () => {
      vv.removeEventListener('resize', fit)
      vv.removeEventListener('scroll', fit)
    }
  }, [])

  // 어두운 배경을 문지르면 iOS 가 뒤 화면을 고무줄처럼 끌어당긴다. body 를 잠가도 막히지 않는다.
  // 모달 안의 스크롤은 살려야 하므로, 손가락을 처음 댄 곳이 .modal-body 바깥일 때만 막는다.
  // preventDefault 가 먹으려면 passive 가 아니어야 한다.
  useEffect(() => {
    const el = overlayRef.current
    if (!el) return

    const onTouchMove = (e: TouchEvent) => {
      const target = e.target
      if (target instanceof Element && target.closest('.modal-body')) return
      e.preventDefault()
    }

    el.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => el.removeEventListener('touchmove', onTouchMove)
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
