import { useState } from 'react'
import { authErrorMessage } from '../firebase'

function isInAppBrowser() {
  const ua = navigator.userAgent
  return /NAVER|KAKAOTALK|Instagram|FBAN|FBAV|Line\/|MicroMessenger|Snapchat/i.test(ua)
}

type Mode = 'login' | 'signup' | 'reset'

interface Props {
  onSignIn: () => Promise<unknown>
  onEmailSignIn: (email: string, password: string) => Promise<unknown>
  onEmailSignUp: (name: string, email: string, password: string) => Promise<{ verificationSent: boolean }>
  onPasswordReset: (email: string) => Promise<void>
}

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 8s2.5-4.5 7-4.5S15 8 15 8s-2.5 4.5-7 4.5S1 8 1 8Z" />
      <circle cx="8" cy="8" r="2" />
      {off && <path d="M2 14 14 2" />}
    </svg>
  )
}

export default function LoginOverlay({ onSignIn, onEmailSignIn, onEmailSignUp, onPasswordReset }: Props) {
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  // 구글 팝업과 이메일 폼의 진행 상태를 분리한다.
  // 구글 팝업은 COOP 때문에 Firebase 가 닫힘을 감지 못 해 Promise 가 안 풀릴 수 있는데,
  // 상태를 같이 쓰면 그때 이메일 로그인 버튼까지 '처리 중…'으로 영구히 잠긴다.
  const [googleBusy, setGoogleBusy] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const inApp = isInAppBrowser()

  const switchMode = (m: Mode) => {
    setMode(m)
    setError('')
  }

  const handleGoogle = async () => {
    setGoogleBusy(true)
    setError('')
    try {
      await onSignIn()
    } catch (err) {
      const msg = authErrorMessage(err)
      if (msg) setError(msg)
    } finally {
      setGoogleBusy(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'signup' && password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않아요')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      if (mode === 'signup') {
        // 가입에 성공하면 곧바로 로그인 상태가 되어 이 화면이 사라진다.
        // 결과 안내(인증 메일 발송 여부 포함)는 App 이 토스트로 띄운다.
        await onEmailSignUp(name.trim(), email.trim(), password)
      } else {
        await onEmailSignIn(email.trim(), password)
      }
    } catch (err) {
      const msg = authErrorMessage(err)
      if (msg) setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await onPasswordReset(email.trim())
      setResetSent(true)
    } catch (err) {
      const msg = authErrorMessage(err)
      if (msg) setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-overlay">
      <div className="login-card">
        <div className="login-icon">
          <svg width="28" height="28" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H15a1.5 1.5 0 0 1 1.5 1.5V7" />
            <rect x="3" y="7" width="16" height="11" rx="2" />
            <path d="M19 11h-3a1.5 1.5 0 0 0 0 3h3" />
          </svg>
        </div>
        <h2>Moneylog</h2>

        {mode === 'reset' ? (
          resetSent ? (
            <>
              <p className="login-reset-done">
                <b>{email}</b>로 재설정 메일을 보냈어요.<br />메일함(스팸함 포함)을 확인해주세요.
              </p>
              <button className="btn btn-secondary login-block-btn" onClick={() => { switchMode('login'); setResetSent(false) }}>
                로그인으로 돌아가기
              </button>
            </>
          ) : (
            <form onSubmit={handleReset} className="login-form">
              <div className="form-group">
                <label htmlFor="login-reset-email">가입 이메일</label>
                <input id="login-reset-email" type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
                <p className="login-hint">
                  이메일이 기억나지 않으면 비밀번호를 재설정할 수 없어요.<br />
                  Google 계정으로 가입한 건 아닌지 확인해보세요.
                </p>
              </div>
              {error && <p className="login-error">{error}</p>}
              <button type="submit" className="btn btn-primary login-block-btn" disabled={submitting}>
                {submitting ? '보내는 중…' : '재설정 메일 보내기'}
              </button>
              <button type="button" className="btn btn-secondary login-block-btn" onClick={() => switchMode('login')}>
                취소
              </button>
            </form>
          )
        ) : (
          <>
            <p>Google 계정 또는 이메일로 로그인하면 어디서나 같은 가계부를 볼 수 있어요</p>

            {inApp ? (
              <div className="login-warning">
                <p>⚠️ 앱 내 브라우저에서는 Google 로그인이 차단돼요.</p>
                <p style={{ marginTop: 8 }}>Chrome 또는 Safari에서 아래 주소를 열어주세요.</p>
                <div className="login-warning-url">moneylog-3c3d6.web.app</div>
              </div>
            ) : (
              <button className="google-btn" onClick={handleGoogle} disabled={googleBusy}>
                <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4" />
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853" />
                  <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
                </svg>
                <span>Google 계정으로 로그인</span>
              </button>
            )}

            <div className="login-divider"><span>또는</span></div>

            <div className="mode-toggle" role="group" aria-label="로그인 방식">
              <button type="button" className={`mode-btn${mode === 'login' ? ' active' : ''}`} onClick={() => switchMode('login')}>로그인</button>
              <button type="button" className={`mode-btn${mode === 'signup' ? ' active' : ''}`} onClick={() => switchMode('signup')}>회원가입</button>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              {mode === 'signup' && (
                <div className="form-group">
                  <label htmlFor="login-name">이름</label>
                  <input id="login-name" type="text" required value={name} onChange={(e) => setName(e.target.value)} />
                </div>
              )}
              <div className="form-group">
                <label htmlFor="login-email">이메일</label>
                <input id="login-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="login-password">비밀번호</label>
                <div className="login-password-wrap">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={mode === 'signup' ? 6 : undefined}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button type="button" className="login-eye" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}>
                    <EyeIcon off={showPassword} />
                  </button>
                </div>
              </div>
              {mode === 'signup' && (
                <div className="form-group">
                  <label htmlFor="login-password-confirm">비밀번호 확인</label>
                  <input
                    id="login-password-confirm"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                  />
                </div>
              )}
              {mode === 'login' && (
                <button type="button" className="login-link" onClick={() => switchMode('reset')}>비밀번호를 잊으셨나요?</button>
              )}
              {error && <p className="login-error">{error}</p>}
              <button type="submit" className="btn btn-primary login-block-btn" disabled={submitting}>
                {submitting ? '처리 중…' : mode === 'signup' ? '가입하기' : '로그인'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
