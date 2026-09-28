import { useState } from 'react'
import Modal from '../Modal'
import { isPasswordAccount } from '../../firebase'

/** 실수로 눌러 지나가지 못하도록 직접 입력하게 한다. */
const CONFIRM_WORD = '탈퇴'

interface Props {
  email: string
  /** 공유 가계부에 속해 있으면 그 코드. 안내 문구가 달라진다. */
  householdCode: string | null
  /** 이메일 계정이면 비밀번호를, 구글 계정이면 undefined 를 넘긴다. */
  onConfirm: (password?: string) => Promise<void>
  onClose: () => void
}

export default function DeleteAccountModal({ email, householdCode, onConfirm, onClose }: Props) {
  const [word, setWord] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  // 이메일 계정은 비밀번호로, 구글 계정은 팝업으로 본인 확인을 한다.
  const needsPassword = isPasswordAccount()
  const ready = word.trim() === CONFIRM_WORD && (!needsPassword || password.length > 0)

  const handleDelete = async () => {
    if (!ready || busy) return
    setBusy(true)
    setError('')
    try {
      await onConfirm(needsPassword ? password : undefined)
    } catch (err) {
      const code = (err as { code?: string } | null)?.code
      setError(
        code === 'auth/wrong-password' || code === 'auth/invalid-credential'
          ? '비밀번호가 맞지 않아요'
          : code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request'
            ? '본인 확인이 취소됐어요'
            : code === 'auth/too-many-requests'
              ? '너무 많이 시도했어요. 잠시 후 다시 시도해주세요'
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
          {needsPassword && (
            <div className="form-group">
              <label htmlFor="delete-password">본인 확인을 위해 비밀번호를 입력해주세요</label>
              <input
                id="delete-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}
          {!needsPassword && (
            <p className="delete-note">탈퇴하기를 누르면 본인 확인을 위해 Google 로그인 창이 한 번 열립니다.</p>
          )}
          {error && <p className="delete-error">{error}</p>}
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose} disabled={busy}>취소</button>
          <button
            className="btn btn-danger"
            onClick={handleDelete}
            disabled={busy || !ready}
          >
            {busy ? '삭제 중…' : '탈퇴하기'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
