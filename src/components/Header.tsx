import type { User } from 'firebase/auth'

interface Props {
  user: User
  /** user_profiles 문서 기준의 이름·사진. 비어 있으면 Auth 값을 쓴다. */
  displayName: string
  photoURL: string
  mode: 'personal' | 'shared'
  onAvatarClick: () => void
}

export default function Header({ user, displayName, photoURL, mode, onAvatarClick }: Props) {
  return (
    <header>
      <div className="header-left">
        <div className="app-logo">Moneylog</div>
        <span className={`mode-badge${mode === 'personal' ? ' mode-badge-personal' : ''}`}>
          {mode === 'personal' ? '개인' : '공유'}
        </span>
      </div>
      <div className="header-right">
        <button
          className={`user-avatar${photoURL ? '' : ' user-avatar-initial'}`}
          onClick={onAvatarClick}
          title="더보기"
          aria-label="더보기"
        >
          {photoURL
            ? <img className="user-avatar-img" src={photoURL} referrerPolicy="no-referrer" alt="" />
            : (displayName || user.email || '?')[0].toUpperCase()}
        </button>
      </div>
    </header>
  )
}
