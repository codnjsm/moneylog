import { useState } from 'react'

interface Props {
  mode: 'personal' | 'shared'
  householdCode: string | null
  onSwitchMode: (mode: 'personal' | 'shared') => void
  onCreate: () => Promise<void>
  onJoin: (code: string) => Promise<boolean>
  onLeave: () => Promise<void>
}

export default function HouseholdSection({ mode, householdCode, onSwitchMode, onCreate, onJoin, onLeave }: Props) {
  const [localMode, setLocalMode] = useState<'personal' | 'shared'>(mode)
  const [view, setView] = useState<'main' | 'join'>('main')
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState('')
  const [copied, setCopied] = useState(false)

  const handleModeClick = (m: 'personal' | 'shared') => {
    setLocalMode(m)
    if (m === 'personal') onSwitchMode('personal')
    else if (m === 'shared' && householdCode) onSwitchMode('shared')
  }

  const handleCopy = () => {
    if (!householdCode) return
    navigator.clipboard.writeText(householdCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleJoin = async () => {
    const code = joinCode.trim().toUpperCase()
    if (code.length < 4) return
    const ok = await onJoin(code)
    if (ok) { setView('main'); setJoinCode('') }
    else setJoinError('유효하지 않은 코드예요')
  }

  const handleLeave = async () => {
    if (!confirm('공유 가계부에서 나갈까요?')) return
    await onLeave()
  }

  return (
    <>
      <div className="form-group">
        <label>가계부 모드</label>
        <div className="mode-toggle">
          <button className={`mode-btn${localMode === 'personal' ? ' active' : ''}`} onClick={() => handleModeClick('personal')}>
            개인
          </button>
          <button className={`mode-btn${localMode === 'shared' ? ' active' : ''}`} onClick={() => handleModeClick('shared')}>
            공유
          </button>
        </div>
      </div>

      {localMode === 'shared' && (
        <div className="form-group">
          <label>공유 가계부</label>

          {householdCode ? (
            <div className="household-box">
              <div className="household-code-row">
                <span className="household-code-label">초대 코드</span>
                <span className="household-code">{householdCode}</span>
                <button className="btn btn-ghost" onClick={handleCopy} style={{ padding: '4px 10px', fontSize: 12 }}>
                  {copied ? '✓ 복사됨' : '복사'}
                </button>
              </div>
              <p className="household-hint">이 코드를 공유하면 같은 가계부를 함께 볼 수 있어요</p>
              <button className="btn btn-danger" onClick={handleLeave}>공유 가계부 나가기</button>
            </div>
          ) : view === 'join' ? (
            <div className="household-join">
              <input
                value={joinCode}
                onChange={e => { setJoinCode(e.target.value.toUpperCase()); setJoinError('') }}
                placeholder="초대 코드 입력"
                maxLength={8}
                style={{ textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600, textAlign: 'center' }}
                autoFocus
              />
              {joinError && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{joinError}</p>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" onClick={() => { setView('main'); setJoinCode(''); setJoinError('') }}>취소</button>
                <button className="btn btn-primary" onClick={handleJoin} disabled={joinCode.trim().length < 4}>참여하기</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button className="btn btn-primary" onClick={async () => { await onCreate(); setLocalMode('shared') }}>새로 만들기</button>
              <button className="btn btn-secondary" onClick={() => setView('join')}>코드로 참여하기</button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
