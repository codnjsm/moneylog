import { useState } from 'react'
import type { User } from 'firebase/auth'
import HouseholdSection from '../HouseholdSection'
import ExportModal from '../ExportModal'

interface Props {
  user: User
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
}

export default function MoreTab({ user, mode, householdCode, theme, onSetTheme, onSwitchMode, onCreate, onJoin, onLeave, onSignOut, onExport }: Props) {
  const [exportOpen, setExportOpen] = useState(false)

  const handleSignOut = () => {
    if (!confirm('로그아웃할까요?')) return
    onSignOut()
  }

  return (
    <div className="tab-content more-page">
      <div className="more-card">
        <div className="account-user more-account-row" style={{ padding: 0 }}>
          {user.photoURL
            ? <img src={user.photoURL} referrerPolicy="no-referrer" className="account-avatar" alt="" />
            : <div className="account-avatar-placeholder">{(user.displayName || user.email || '?')[0].toUpperCase()}</div>
          }
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="account-name">{user.displayName || '사용자'}</div>
            <div className="account-email">{user.email}</div>
          </div>
          <span className="more-status-badge"><span className="dot" />동기화됨</span>
        </div>
      </div>

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
        <span className="more-row-left" style={{ color: 'var(--danger)' }}>
          <svg width="20" height="20" viewBox="0 0 22 22" fill="none" stroke="var(--danger)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 4H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h4"/>
            <path d="M15 15l4-4-4-4"/>
            <path d="M19 11H9"/>
          </svg>
          로그아웃
        </span>
      </button>

      <div className="more-footer">
        <div className="more-footer-brand">Moneylog</div>
        로그아웃해도 이 계정의 데이터는 남아 있어요.
      </div>

      {exportOpen && <ExportModal onExport={onExport} onClose={() => setExportOpen(false)} />}
    </div>
  )
}
