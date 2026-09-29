import type { User } from 'firebase/auth'
import { TABS, type Tab } from '../tabs'
import TabIcon from './TabIcon'

interface Props {
  active: Tab
  onChange: (t: Tab) => void
  user: User
  /** user_profiles 문서 기준의 이름·사진. 비어 있으면 Auth 값을 쓴다. */
  displayName: string
  photoURL: string
  mode: 'personal' | 'shared'
  onAvatarClick: () => void
}

export default function Sidebar({ active, onChange, user, displayName, photoURL, mode, onAvatarClick }: Props) {
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
            aria-current={active === t.id ? 'page' : undefined}
          >
            <span className="sidebar-item-icon" aria-hidden="true"><TabIcon tab={t.id} size={18} /></span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <button className="sidebar-user" onClick={onAvatarClick} aria-label="더보기">
          {photoURL
            ? <img className="user-avatar" src={photoURL} referrerPolicy="no-referrer" alt="" />
            : <div className="user-avatar user-avatar-initial">{(displayName || user.email || '?')[0].toUpperCase()}</div>
          }
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{displayName || '사용자'}</div>
            <div className="sidebar-user-email">{user.email}</div>
          </div>
        </button>
      </div>
    </aside>
  )
}
