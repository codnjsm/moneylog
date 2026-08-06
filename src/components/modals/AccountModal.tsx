import { useState } from 'react'
import Modal from '../Modal'
import type { User } from 'firebase/auth'

const won = (n: number) => n.toLocaleString('ko-KR') + '원'

function filterByRange(data: any, from: string, to: string): any {
  const inRange = (ym: string) => (!from || ym >= from) && (!to || ym <= to)
  return {
    ...data,
    expenses: data.expenses?.filter((e: any) => inRange(e.yearMonth)) ?? [],
    fixedMonthly: data.fixedMonthly?.filter((e: any) => inRange(e.yearMonth)) ?? [],
    savingsMonthly: data.savingsMonthly?.filter((e: any) => inRange(e.yearMonth)) ?? [],
    monthlyIncome: data.monthlyIncome?.filter((e: any) => inRange(e.yearMonth)) ?? [],
    assetSnapshots: data.assetSnapshots?.filter((e: any) => inRange(e.yearMonth)) ?? [],
  }
}

function formatAsText(data: any): string {
  const lines: string[] = []
  const catMap: Record<string, string> = {}
  for (const c of data.categories?.categories ?? []) catMap[c.id] = c.label
  const methodMap: Record<string, string> = {}
  for (const m of data.paymentMethods?.methods ?? []) methodMap[m.id] = m.label
  const accountMap: Record<string, string> = {}
  for (const a of data.assetAccounts ?? []) accountMap[a.id] = a.label

  lines.push('Moneylog 데이터 백업')
  lines.push(`내보낸 날짜: ${data.exportedAt?.slice(0, 10) ?? ''}`)

  // 지출/수입
  lines.push('\n\n━━━ 지출 / 수입 내역 ━━━')
  const byMonth: Record<string, any[]> = {}
  for (const e of data.expenses ?? []) {
    (byMonth[e.yearMonth] ??= []).push(e)
  }
  for (const ym of Object.keys(byMonth).sort()) {
    lines.push(`\n[${ym}]`)
    const sorted = byMonth[ym].sort((a: any, b: any) => a.date.localeCompare(b.date))
    const incomes = sorted.filter((e: any) => e.type === 'income')
    const expenses = sorted.filter((e: any) => e.type !== 'income')
    if (incomes.length) {
      lines.push('  ▸ 수입')
      for (const e of incomes)
        lines.push(`    ${e.date}  ${e.label}  +${won(e.amount)}`)
    }
    if (expenses.length) {
      lines.push('  ▸ 지출')
      for (const e of expenses) {
        const cat = e.category ? ` [${catMap[e.category] ?? e.category}]` : ''
        const method = e.paymentMethod ? ` (${methodMap[e.paymentMethod] ?? e.paymentMethod})` : ''
        lines.push(`    ${e.date}  ${e.label}${cat}  -${won(e.amount)}${method}`)
      }
    }
  }

  // 고정 지출
  if (data.fixedMonthly?.length) {
    lines.push('\n\n━━━ 고정 지출 내역 ━━━')
    for (const fm of [...data.fixedMonthly].sort((a: any, b: any) => a.yearMonth.localeCompare(b.yearMonth))) {
      lines.push(`\n[${fm.yearMonth}]`)
      for (const item of fm.items ?? [])
        lines.push(`  ${item.label}: ${won(item.amount)}${item.paymentDay ? ` (매월 ${item.paymentDay}일)` : ''}`)
    }
  }

  // 적금
  if (data.savingsMonthly?.length) {
    lines.push('\n\n━━━ 적금 / 보험 내역 ━━━')
    for (const sm of [...data.savingsMonthly].sort((a: any, b: any) => a.yearMonth.localeCompare(b.yearMonth))) {
      lines.push(`\n[${sm.yearMonth}]`)
      for (const item of sm.items ?? []) {
        const day = item.paymentDay ? ` (매월 ${item.paymentDay}일)` : ''
        const maturity = item.maturityDate ? ` [만기 ${item.maturityDate.slice(0, 7)}]` : ''
        lines.push(`  ${item.label}: ${won(item.amount)}${day}${maturity}`)
      }
    }
  }

  // 자산 스냅샷
  if (data.assetSnapshots?.length) {
    lines.push('\n\n━━━ 자산 현황 ━━━')
    for (const snap of [...data.assetSnapshots].sort((a: any, b: any) => a.yearMonth.localeCompare(b.yearMonth))) {
      const total = Object.values(snap.amounts as Record<string, number>).reduce((s, v) => s + v, 0)
      lines.push(`\n[${snap.yearMonth}] 기준일: ${snap.asOf}  /  합계: ${won(total)}`)
      for (const [id, amt] of Object.entries(snap.amounts as Record<string, number>))
        lines.push(`  ${accountMap[id] ?? id}: ${won(amt)}`)
    }
  }

  // 결제수단 / 카테고리
  lines.push('\n\n━━━ 결제 수단 ━━━')
  for (const m of data.paymentMethods?.methods ?? [])
    lines.push(`  ${m.label}`)

  lines.push('\n━━━ 카테고리 ━━━')
  for (const c of data.categories?.categories ?? [])
    lines.push(`  ${c.label}`)

  return lines.join('\n')
}

interface Props {
  user: User
  mode: 'personal' | 'shared'
  householdCode: string | null
  onSwitchMode: (mode: 'personal' | 'shared') => void
  onCreate: () => Promise<void>
  onJoin: (code: string) => Promise<boolean>
  onLeave: () => Promise<void>
  onSignOut: () => void
  onExport: () => Promise<unknown>
  onClose: () => void
}

export default function AccountModal({ user, mode, householdCode, onSwitchMode, onCreate, onJoin, onLeave, onSignOut, onExport, onClose }: Props) {
  const [localMode, setLocalMode] = useState<'personal' | 'shared'>(mode)
  const [view, setView] = useState<'main' | 'join' | 'export'>('main')
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState('')
  const [copied, setCopied] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [fromMonth, setFromMonth] = useState('')
  const [toMonth, setToMonth] = useState('')

  const handleExport = async () => {
    setExporting(true)
    try {
      const raw = await onExport() as any
      const data = filterByRange(raw, fromMonth, toMonth)
      const text = formatAsText(data)
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `moneylog_backup_${new Date().toISOString().slice(0, 10)}.txt`
      a.click()
      URL.revokeObjectURL(url)
      setView('main')
    } finally {
      setExporting(false)
    }
  }

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

  if (view === 'export') return (
    <Modal onClose={onClose}>
      <div className="modal">
        <div className="modal-header">
          <h3>데이터 내보내기</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>시작 월</label>
            <input type="month" value={fromMonth} onChange={e => setFromMonth(e.target.value)}
              style={{ width: '100%', fontSize: '14px', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }} />
          </div>
          <div className="form-group">
            <label>종료 월</label>
            <input type="month" value={toMonth} onChange={e => setToMonth(e.target.value)}
              style={{ width: '100%', fontSize: '14px', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }} />
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>비워두면 전체 기간을 내보내요</p>
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setView('main')}>취소</button>
          <button className="btn btn-primary" onClick={handleExport} disabled={exporting}>
            {exporting ? '내보내는 중...' : '내보내기'}
          </button>
        </div>
      </div>
    </Modal>
  )

  return (
    <Modal onClose={onClose}>
      <div className="modal">
        <div className="modal-header">
          <h3>계정 설정</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">

          {/* 유저 정보 */}
          <div className="account-user">
            {user.photoURL
              ? <img src={user.photoURL} referrerPolicy="no-referrer" className="account-avatar" alt="" />
              : <div className="account-avatar-placeholder">{(user.displayName || user.email || '?')[0].toUpperCase()}</div>
            }
            <div>
              <div className="account-name">{user.displayName || '사용자'}</div>
              <div className="account-email">{user.email}</div>
            </div>
          </div>

          {/* 데이터 내보내기 */}
          <div className="form-group">
            <button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => setView('export')}>
              데이터 내보내기
            </button>
          </div>

          {/* 모드 전환 */}
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

          {/* 공유 가계부 섹션 */}
          {localMode === 'shared' && <div className="form-group">
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
          </div>}
        </div>

        <div className="modal-actions">
          <button className="btn btn-ghost" style={{ color: 'var(--danger)', marginRight: 'auto' }}
            onClick={() => { onSignOut(); onClose() }}>
            로그아웃
          </button>
          <button className="btn btn-secondary" onClick={onClose}>저장</button>
        </div>
      </div>
    </Modal>
  )
}
