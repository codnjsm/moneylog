import React from 'react'
import type { User } from 'firebase/auth'
import type { Tab } from './TabBar'

const ICONS: Record<Tab, React.ReactElement> = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="12" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="12" width="7" height="7" rx="1"/><rect x="12" y="12" width="7" height="7" rx="1"/>
    </svg>
  ),
  calendar: (
    <svg width="18" height="18" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="16" height="14" rx="2"/>
      <path d="M3 10h16"/><path d="M7 3v4"/><path d="M15 3v4"/>
    </svg>
  ),
  expense: (
    <svg width="18" height="18" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="18" height="13" rx="2"/>
      <path d="M2 10h18"/><path d="M6 14h4"/>
    </svg>
  ),
  fixed: (
    <svg width="18" height="18" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="16" height="14" rx="2"/>
      <path d="M3 10h16"/><path d="M7 3v4"/><path d="M15 3v4"/>
      <path d="M7 14h2"/><path d="M11 14h2"/><path d="M7 17h2"/>
    </svg>
  ),
  assets: (
    <svg width="18" height="18" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 19h16"/><path d="M5 19v-5"/><path d="M9 19v-9"/>
      <path d="M13 19v-7"/><path d="M17 19v-12"/>
    </svg>
  ),
  stocks: (
    <svg width="18" height="18" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17l5-6 4 3 6-8"/><path d="M14 6h4v4"/>
    </svg>
  ),
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'calendar', label: '캘린더' },
  { id: 'fixed', label: '예산' },
  { id: 'expense', label: '지출' },
  { id: 'stocks', label: '주식' },
  { id: 'assets', label: '자산' },
  { id: 'dashboard', label: '차트' },
]

interface Props {
  active: Tab
  onChange: (t: Tab) => void
  user: User
  mode: 'personal' | 'shared'
  onAvatarClick: () => void
}

export default function Sidebar({ active, onChange, user, mode, onAvatarClick }: Props) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">Moneylog</div>
        <span className={`mode-badge${mode === 'personal' ? ' mode-badge-personal' : ''}`}>
          {mode === 'personal' ? '개인' : '공유'}
        </span>
      </div>

      <nav className="sidebar-nav">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`sidebar-item${active === t.id ? ' active' : ''}`}
            onClick={() => onChange(t.id)}
          >
            <span className="sidebar-item-icon">{ICONS[t.id]}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-user" onClick={onAvatarClick}>
          {user.photoURL
            ? <img className="user-avatar" src={user.photoURL} referrerPolicy="no-referrer" alt="" />
            : <div className="user-avatar user-avatar-initial">{(user.displayName || user.email || '?')[0].toUpperCase()}</div>
          }
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user.displayName || '사용자'}</div>
            <div className="sidebar-user-email">{user.email}</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
