import { useRef, useState } from 'react'
import type { User } from 'firebase/auth'
import HouseholdSection from '../HouseholdSection'
import ExportModal from '../ExportModal'
import AvatarCropModal from '../modals/AvatarCropModal'
import { sendVerificationEmail } from '../../firebase'
import DeleteAccountModal from '../modals/DeleteAccountModal'

interface Props {
  user: User
  displayName: string
  photoURL: string
  onChangeName: (name: string) => Promise<void>
  onChangePhoto: (photoURL: string) => Promise<void>
  mode: 'personal' | 'shared'
  householdCode: string | null
  theme: 'light' | 'dark'
  onSetTheme: (theme: 'light' | 'dark') => void
  onSwitchMode: (mode: 'personal' | 'shared') => void
  onCreate: () => Promise<void>
  onJoin: (code: string) => Promise<boolean>
  onLeave: () => Promise<void>
  onSignOut: () => void
  onExport: () => Promise<unknown>
  /** 이메일 인증 여부를 서버에서 다시 읽어온다. 인증됐으면 true. */
  onRefreshUser: () => Promise<boolean>
  onDeleteAccount: (password?: string) => Promise<void>
}

export default function MoreTab({ user, displayName, photoURL, onChangeName, onChangePhoto, mode, householdCode, theme, onSetTheme, onSwitchMode, onCreate, onJoin, onLeave, onSignOut, onExport, onRefreshUser, onDeleteAccount }: Props) {
  const [exportOpen, setExportOpen] = useState(false)
  const [nameEditing, setNameEditing] = useState(false)
  const [nameDraft, setNameDraft] = useState(displayName)
  const [saving, setSaving] = useState(false)
  const [cropFile, setCropFile] = useState<File | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [verifyBusy, setVerifyBusy] = useState(false)
  const [verifyMsg, setVerifyMsg] = useState('')

  // 구글 로그인은 항상 인증된 상태로 들어오므로, 이메일 가입자에게만 뜬다.
  const needsVerify = !user.emailVerified

  const resendVerification = async () => {
    setVerifyBusy(true)
    setVerifyMsg('')
    try {
      await sendVerificationEmail()
      setVerifyMsg('인증 메일을 다시 보냈어요')
    } catch {
      setVerifyMsg('메일을 보내지 못했어요. 잠시 후 다시 시도해주세요')
    } finally {
      setVerifyBusy(false)
    }
  }

  const checkVerified = async () => {
    setVerifyBusy(true)
    setVerifyMsg('')
    try {
      const ok = await onRefreshUser()
      // 인증됐으면 배너가 사라지고, 완료 알림은 App 이 띄운다.
      if (!ok) setVerifyMsg('아직 인증 전이에요. 메일의 링크를 눌러주세요')
    } catch {
      setVerifyMsg('확인하지 못했어요. 잠시 후 다시 시도해주세요')
    } finally {
      setVerifyBusy(false)
    }
  }
  const photoInputRef = useRef<HTMLInputElement>(null)

  const startEditName = () => {
    setNameDraft(displayName)
    setNameEditing(true)
  }

  const saveName = async () => {
    const next = nameDraft.trim()
    if (!next || next === displayName) {
      setNameEditing(false)
      return
    }
    setSaving(true)
    try {
      await onChangeName(next)
      setNameEditing(false)
    } catch {
      alert('이름을 저장하지 못했어요')
    } finally {
      setSaving(false)
    }
  }

  // 사진이 없으면 고를 것밖에 없으니 바로 파일 선택기를 연다.
  // 이미 있을 때만 "변경 / 삭제"를 고르는 메뉴를 띄운다.
  const handlePhotoClick = () => {
    if (!photoURL) photoInputRef.current?.click()
    else setMenuOpen(true)
  }

  const savePhoto = async (next: string) => {
    setMenuOpen(false)
    setSaving(true)
    try {
      await onChangePhoto(next)
    } catch {
      alert('사진을 저장하지 못했어요')
    } finally {
      setSaving(false)
    }
  }

  const handlePhotoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // 같은 파일을 다시 골라도 change 가 뜨도록 비워둔다
    e.target.value = ''
    if (file) setCropFile(file)
  }

  const handleSignOut = () => {
    if (!confirm('로그아웃할까요?')) return
    onSignOut()
  }

  return (
    <div className="tab-content more-page">
      <div className="more-card">
        <div className="account-user more-account-row" style={{ padding: 0 }}>
          <div className="account-avatar-wrap">
          {menuOpen && (
            <>
              {/* 바깥을 눌러 닫는다 */}
              <div className="account-menu-scrim" onClick={() => setMenuOpen(false)} />
              <div className="account-menu" role="menu">
                <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); photoInputRef.current?.click() }}>
                  사진 변경
                </button>
                <button type="button" role="menuitem" className="danger" onClick={() => savePhoto('')}>
                  사진 삭제
                </button>
              </div>
            </>
          )}
          <button
            type="button"
            className="account-avatar-btn"
            onClick={handlePhotoClick}
            disabled={saving}
            aria-haspopup={photoURL ? 'menu' : undefined}
            aria-expanded={photoURL ? menuOpen : undefined}
            aria-label={photoURL ? '프로필 사진 바꾸기' : '프로필 사진 추가'}
          >
            {photoURL
              ? <img src={photoURL} referrerPolicy="no-referrer" className="account-avatar" alt="" />
              : <div className="account-avatar-placeholder">{(displayName || user.email || '?')[0].toUpperCase()}</div>
            }
            <span className="account-avatar-edit" aria-hidden="true">
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 1.5 10.5 4 4 10.5H1.5V8z" />
              </svg>
            </span>
          </button>
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handlePhotoSelected}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            {nameEditing ? (
              <div className="account-name-edit">
                <input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) saveName() }}
                  aria-label="이름"
                  autoFocus
                />
                <button className="btn btn-primary btn-sm" onClick={saveName} disabled={saving}>저장</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setNameEditing(false)} disabled={saving}>취소</button>
              </div>
            ) : (
              <button type="button" className="account-name-btn" onClick={startEditName}>
                <span className="account-name">{displayName || '사용자'}</span>
                <span className="account-name-hint">수정</span>
              </button>
            )}
            <div className="account-email">{user.email}</div>
          </div>
          {!nameEditing && <span className="more-status-badge"><span className="dot" />동기화됨</span>}
        </div>

      </div>

      {needsVerify && (
        <div className="verify-card">
          <div className="verify-title">이메일 인증이 아직 안 됐어요</div>
          <p className="verify-body">
            <b>{user.email}</b>으로 보낸 메일의 링크를 눌러주세요.
            비밀번호를 잊었을 때 이 주소로만 재설정 메일을 보낼 수 있어서,
            주소가 잘못돼 있으면 계정을 되찾지 못해요.
          </p>
          {verifyMsg && <p className="verify-msg">{verifyMsg}</p>}
          <div className="verify-actions">
            <button className="btn btn-secondary btn-sm" onClick={resendVerification} disabled={verifyBusy}>
              {verifyBusy ? '처리 중…' : '메일 다시 보내기'}
            </button>
            <button className="btn btn-primary btn-sm" onClick={checkVerified} disabled={verifyBusy}>
              인증했어요
            </button>
          </div>
        </div>
      )}

      <div className="more-card">
        <div className="more-row">
          <span className="more-row-left">
            <svg width="20" height="20" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="4"/>
              <path d="M11 2v2M11 18v2M4 11H2M20 11h-2M5.5 5.5l1.4 1.4M15.1 15.1l1.4 1.4M5.5 16.5l1.4-1.4M15.1 6.9l1.4-1.4"/>
            </svg>
            테마
          </span>
          <div className="mode-toggle more-theme-toggle" role="group" aria-label="테마">
            <button className={`mode-btn${theme === 'light' ? ' active' : ''}`} onClick={() => onSetTheme('light')}>라이트</button>
            <button className={`mode-btn${theme === 'dark' ? ' active' : ''}`} onClick={() => onSetTheme('dark')}>다크</button>
          </div>
        </div>
      </div>

      <div className="more-card">
        <HouseholdSection mode={mode} householdCode={householdCode} onSwitchMode={onSwitchMode} onCreate={onCreate} onJoin={onJoin} onLeave={onLeave} />
      </div>

      <button type="button" className="more-card more-row" onClick={() => setExportOpen(true)}>
        <span className="more-row-left">
          <svg width="20" height="20" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 3v12"/>
            <path d="M6 10l5 5 5-5"/>
            <path d="M4 19h14"/>
          </svg>
          기록 내보내기
        </span>
        <span className="more-row-hint">.txt</span>
      </button>

      <button type="button" className="more-card more-row" onClick={handleSignOut}>
        <span className="more-row-left">
          <svg width="20" height="20" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 4H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h4"/>
            <path d="M15 15l4-4-4-4"/>
            <path d="M19 11H9"/>
          </svg>
          로그아웃
        </span>
      </button>

      <button type="button" className="more-card more-row" onClick={() => setDeleteOpen(true)}>
        <span className="more-row-left" style={{ color: 'var(--danger)' }}>
          <svg width="20" height="20" viewBox="0 0 22 22" fill="none" stroke="var(--danger)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 6h14"/>
            <path d="M9 6V4h4v2"/>
            <path d="M6 6v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6"/>
            <path d="M9.5 10v5"/>
            <path d="M12.5 10v5"/>
          </svg>
          회원 탈퇴
        </span>
      </button>

      <div className="more-footer">
        <div className="more-footer-brand">Moneylog</div>
        로그아웃해도 이 계정의 데이터는 남아 있어요.
      </div>

      {deleteOpen && (
        <DeleteAccountModal
          email={user.email ?? ''}
          householdCode={householdCode}
          onConfirm={onDeleteAccount}
          onClose={() => setDeleteOpen(false)}
        />
      )}
      {cropFile && (
        <AvatarCropModal
          file={cropFile}
          onCancel={() => setCropFile(null)}
          onApply={(dataUrl) => { setCropFile(null); savePhoto(dataUrl) }}
        />
      )}
      {exportOpen && <ExportModal onExport={onExport} onClose={() => setExportOpen(false)} />}
    </div>
  )
}
