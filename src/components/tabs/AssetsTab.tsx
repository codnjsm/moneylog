import { useState } from 'react'
import type { AssetAccount, AssetSnapshot, AssetTypeDef } from '../../types'
import CustomSelect from '../CustomSelect'
import { fmtWon as fmt } from '../../utils'

interface Props {
  accounts: AssetAccount[]
  snapshot: AssetSnapshot | null
  assetTypes: AssetTypeDef[]
  onAddAccount: () => void
  onEditAccount: (account: AssetAccount) => void
  onDeleteAccount: (id: string) => void
  onSaveSnapshot: (amounts: Record<string, number>, asOf: string) => void
  onEditTypes: () => void
}


export default function AssetsTab({ accounts, snapshot, assetTypes, onAddAccount, onEditAccount, onDeleteAccount, onSaveSnapshot, onEditTypes }: Props) {
  const today = new Date().toISOString().slice(0, 10)
  const [editing, setEditing] = useState(false)
  const [filterType, setFilterType] = useState('all')
  const [amounts, setAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(accounts.map((a) => [a.id, String(snapshot?.amounts?.[a.id] ?? '')]))
  )
  const [asOf, setAsOf] = useState(snapshot?.asOf ?? today)

  const handleEdit = () => {
    setAmounts(Object.fromEntries(accounts.map((a) => [a.id, String(snapshot?.amounts?.[a.id] ?? '')])))
    setAsOf(snapshot?.asOf ?? today)
    setEditing(true)
  }

  const handleSave = () => {
    const parsed = Object.fromEntries(
      Object.entries(amounts).map(([id, v]) => [id, Number(v) || 0])
    )
    onSaveSnapshot(parsed, asOf)
    setEditing(false)
  }

  const getType = (id: string) => assetTypes.find(t => t.id === id) ?? { id, label: id, color: '#94A3B8' }

  const currentAmounts = snapshot?.amounts ?? {}
  const total = accounts.reduce((s, a) => s + (currentAmounts[a.id] ?? 0), 0)

  const typeOrder = Object.fromEntries(assetTypes.map((t, i) => [t.id, i]))
  const sorted = [...accounts].sort((a, b) => (typeOrder[a.type] ?? 999) - (typeOrder[b.type] ?? 999))
  const filtered = filterType === 'all' ? sorted : sorted.filter(a => a.type === filterType)

  const renderCard = (a: AssetAccount) => {
    const amount = currentAmounts[a.id] ?? 0
    const t = getType(a.type)
    return (
      <div key={a.id} className="asset-card" onClick={() => onEditAccount(a)}>
        <div className="asset-card-left">
          <span className="asset-type-badge" style={{ color: t.color, background: t.color + '26' }}>{t.label}</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div className="asset-label">{a.label}</div>
            {(a.paymentDay || a.maturityDate) && (
              <div className="asset-sub">
                {a.paymentDay && `매월 ${a.paymentDay}일`}
                {a.paymentDay && a.maturityDate && ' · '}
                {a.maturityDate && `만기 ${a.maturityDate}`}
              </div>
            )}
          </div>
        </div>
        <div className="asset-card-right">
          <div className="asset-amount">{amount > 0 ? fmt(amount) : '—'}</div>
          <button
            className="asset-delete-btn"
            onClick={(e) => { e.stopPropagation(); if (confirm('삭제할까요?')) onDeleteAccount(a.id) }}
          >✕</button>
        </div>
      </div>
    )
  }

  const liquidAccounts = filtered.filter(a => a.liquid !== false)
  const illiquidAccounts = filtered.filter(a => a.liquid === false)
  const liquidTotal = liquidAccounts.reduce((s, a) => s + (currentAmounts[a.id] ?? 0), 0)
  const illiquidTotal = illiquidAccounts.reduce((s, a) => s + (currentAmounts[a.id] ?? 0), 0)
  const showGroups = filterType === 'all'

  const typeOptions = [
    { value: 'all', label: '종류 전체' },
    ...assetTypes.map(t => ({ value: t.id, label: t.label })),
  ]

  return (
    <div className="tab-content">
      <div className="assets-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div className="assets-total-label">총 자산</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {!editing && <button className="btn btn-secondary btn-sm" onClick={handleEdit}>잔고 업데이트</button>}
            <button className="btn btn-secondary btn-sm" onClick={onAddAccount}>+ 계좌 추가</button>
          </div>
        </div>
        <div className="assets-total">{fmt(total)}</div>
        {snapshot?.asOf && <div className="assets-asof">{snapshot.asOf} 기준</div>}
      </div>

      <div className="filter-row-wrap">
        <CustomSelect
          value={filterType}
          options={typeOptions}
          onChange={setFilterType}
          action={{ label: '종류 편집', onClick: onEditTypes }}
        />
      </div>

      {editing && (
        <div className="asset-edit-box">
          <div className="asset-edit-row" style={{ marginBottom: 12 }}>
            <span className="asset-edit-label">잔고 기준일</span>
            <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} max={today} style={{ width: 180, textAlign: 'center' }} />
          </div>
          {accounts.map((a) => (
            <div key={a.id} className="asset-edit-row">
              <span className="asset-edit-label">{a.label}</span>
              <input
                type="number"
                value={amounts[a.id] ?? ''}
                onChange={(e) => setAmounts((prev) => ({ ...prev, [a.id]: e.target.value }))}
                placeholder="0"
                min={0}
                style={{ width: 180, textAlign: 'right' }}
              />
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditing(false)}>취소</button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave}>저장</button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>등록된 계좌가 없어요</p>
          <p className="empty-sub">위 버튼으로 계좌를 추가하세요</p>
        </div>
      ) : showGroups ? (
        <>
          {liquidAccounts.length > 0 && (
            <>
              <div className="asset-group-header">
                <span>유동 자산</span>
                <span>{fmt(liquidTotal)}</span>
              </div>
              <div className="asset-list">{liquidAccounts.map(renderCard)}</div>
            </>
          )}
          {illiquidAccounts.length > 0 && (
            <>
              <div className="asset-group-header">
                <span>비유동 자산</span>
                <span>{fmt(illiquidTotal)}</span>
              </div>
              <div className="asset-list">{illiquidAccounts.map(renderCard)}</div>
            </>
          )}
        </>
      ) : (
        <div className="asset-list">{filtered.map(renderCard)}</div>
      )}
    </div>
  )
}
