import { useEffect, useRef, useState } from 'react'
import Modal from '../Modal'
import { loadImage, cropToAvatar } from '../../lib/image'

/** 미리보기 정사각 영역의 한 변(px). 실제 저장은 항상 128px이라 이 값은 조작 편의용이다. */
const VIEW = 260
const MAX_ZOOM = 3

interface Props {
  file: File
  onCancel: () => void
  onApply: (dataUrl: string) => void
}

export default function AvatarCropModal({ file, onCancel, onApply }: Props) {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [error, setError] = useState(false)
  const [zoom, setZoom] = useState(1)
  // 이미지를 미리보기 영역 좌상단 기준으로 얼마나 밀어둘지(px). 항상 음수이거나 0이다.
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null)

  useEffect(() => {
    let revoke: (() => void) | null = null
    loadImage(file)
      .then((r) => {
        revoke = r.revoke
        setImg(r.img)
      })
      .catch(() => setError(true))
    return () => revoke?.()
  }, [file])

  // 짧은 변이 미리보기를 꽉 채우는 배율. 여기에 zoom을 곱한 게 실제 표시 크기다.
  const base = img ? VIEW / Math.min(img.width, img.height) : 1
  const k = base * zoom
  const drawW = img ? img.width * k : 0
  const drawH = img ? img.height * k : 0

  // 이미지가 미리보기를 항상 덮도록 이동 범위를 가둔다. 안 그러면 빈 공간이 생긴다.
  const clamp = (x: number, y: number) => ({
    x: Math.min(0, Math.max(VIEW - drawW, x)),
    y: Math.min(0, Math.max(VIEW - drawH, y)),
  })

  // 확대/축소는 미리보기 중심을 기준으로 한다 — 손가락 위치와 무관하게 보던 곳이 유지된다.
  const handleZoom = (next: number) => {
    if (!img) return
    const prevK = base * zoom
    const nextK = base * next
    const cx = (VIEW / 2 - offset.x) / prevK
    const cy = (VIEW / 2 - offset.y) / prevK
    const nx = VIEW / 2 - cx * nextK
    const ny = VIEW / 2 - cy * nextK
    const w = img.width * nextK
    const h = img.height * nextK
    setZoom(next)
    setOffset({ x: Math.min(0, Math.max(VIEW - w, nx)), y: Math.min(0, Math.max(VIEW - h, ny)) })
  }

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { px: e.clientX, py: e.clientY, ox: offset.x, oy: offset.y }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d) return
    setOffset(clamp(d.ox + (e.clientX - d.px), d.oy + (e.clientY - d.py)))
  }
  const onPointerUp = () => {
    dragRef.current = null
  }

  const handleApply = () => {
    if (!img) return
    // 미리보기에 보이는 사각형을 원본 픽셀 좌표로 되돌린다.
    onApply(cropToAvatar(img, { sx: -offset.x / k, sy: -offset.y / k, size: VIEW / k }))
  }

  return (
    <Modal onClose={onCancel}>
      <div className="modal">
        <div className="modal-header">
          <h3>사진 편집</h3>
          <button className="modal-close" onClick={onCancel} aria-label="닫기">✕</button>
        </div>
        <div className="modal-body">
          {error ? (
            <p className="crop-error">사진을 불러오지 못했어요</p>
          ) : (
            <>
              <div
                className="crop-view"
                style={{ width: VIEW, height: VIEW }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              >
                {img && (
                  <img
                    src={img.src}
                    alt=""
                    draggable={false}
                    className="crop-img"
                    style={{ width: drawW, height: drawH, transform: `translate(${offset.x}px, ${offset.y}px)` }}
                  />
                )}
                {/* 실제로 저장되는 건 이 원 안쪽. 원형 요소에 바깥쪽 그림자를 크게 줘서 원 바깥만
                    어둡게 덮는다 (부모가 overflow:hidden 이라 그림자가 미리보기 밖으로 안 번진다). */}
                <div className="crop-ring" />
              </div>
              <div className="crop-zoom">
                <span>확대</span>
                <input
                  type="range"
                  min={1}
                  max={MAX_ZOOM}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => handleZoom(Number(e.target.value))}
                  aria-label="확대 배율"
                />
              </div>
              <p className="crop-hint">드래그해서 위치를 맞추고, 원 안에 담길 부분을 정해주세요</p>
            </>
          )}
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onCancel}>취소</button>
          <button className="btn btn-primary" onClick={handleApply} disabled={!img || error}>적용</button>
        </div>
      </div>
    </Modal>
  )
}
