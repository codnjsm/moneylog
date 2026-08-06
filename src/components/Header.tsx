import type { User } from 'firebase/auth'

interface Props {
  user: User
  mode: 'personal' | 'shared'
  onAvatarClick: () => void
}

export default function Header({ user, mode, onAvatarClick }: Props) {
  return (
    <header>
      <div className="header-left">
        <div className="app-logo">Moneylog</div>
        <span className={`mode-badge${mode === 'personal' ? ' mode-badge-personal' : ''}`}>
          {mode === 'personal' ? '개인' : '공유'}
        </span>
      </div>
      <div className="header-right">
        {user.photoURL
          ? <img className="user-avatar" src={user.photoURL} referrerPolicy="no-referrer" alt="" onClick={onAvatarClick} title="계정 설정" />
          : <button className="user-avatar user-avatar-initial" onClick={onAvatarClick} title="계정 설정">
              {(user.displayName || user.email || '?')[0].toUpperCase()}
            </button>
        }
      </div>
    </header>
  )
}
