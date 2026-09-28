import { useState } from 'react'
import Modal from '../Modal'

/** 실수로 눌러 지나가지 못하도록 직접 입력하게 한다. */
const CONFIRM_WORD = '탈퇴'

interface Props {
  email: string
  /** 공유 가계부에 속해 있으면 그 코드. 안내 문구가 달라진다. */
  householdCode: string | null
  onConfirm: () => Promise<void>
  onClose: () => void
}

export default function DeleteAccountModal({ email, householdCode, onConfirm, onClose }: Props) {
  const [word, setWord] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const handleDelete = async () => {
    if (word.trim() !== CONFIRM_WORD || busy) return
    setBusy(true)
    setError('')
    try {
      await onConfirm()
    } catch (err) {
      const code = (err as { code?: string } | null)?.code
      setError(
        code === 'auth/requires-recent-login'
          ? '보안을 위해 다시 로그인한 뒤 탈퇴해주세요. 로그아웃 후 다시 로그인하면 됩니다'
          : '탈퇴하지 못했어요. 잠시 후 다시 시도해주세요',
      )
      setBusy(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal">
        <div className="modal-header">
          <h3>회원 탈퇴</h3>
          <button className="modal-close" onClick={onClose} aria-label="닫기">✕</button>
        </div>
        <div className="modal-body">
          <p className="delete-lead">
            <b>{email}</b> 계정을 지웁니다.
          </p>
          <div className="delete-list">
            <div className="delete-list-title">영구히 삭제되고 되돌릴 수 없어요</div>
            <ul>
              <li>모든 지출·수입 기록</li>
              <li>고정 지출·적금·자산 내역</li>
              <li>주식 거래 기록</li>
              <li>결제수단·카테고리 설정</li>
            </ul>
          </div>
          {householdCode && (
            <p className="delete-note">
              공유 가계부(<b>{householdCode}</b>)의 기록은 지워지지 않고, 멤버에서만 빠집니다.
              함께 쓰는 분은 그대로 사용할 수 있어요.
            </p>
          )}
          <div className="form-group">
            <label htmlFor="delete-confirm">계속하려면 <b>{CONFIRM_WORD}</b>를 입력해주세요</label>
            <input
              id="delete-confirm"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder={CONFIRM_WORD}
              autoComplete="off"
            />
          </div>
          {error && <p className="delete-error">{error}</p>}
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose} disabled={busy}>취소</button>
          <button
            className="btn btn-danger"
            onClick={handleDelete}
            disabled={busy || word.trim() !== CONFIRM_WORD}
          >
            {busy ? '삭제 중…' : '탈퇴하기'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
