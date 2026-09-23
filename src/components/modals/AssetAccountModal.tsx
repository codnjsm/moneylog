import { useState } from 'react'
import Modal from '../Modal'
import CustomSelect from '../CustomSelect'
import type { AssetAccount, AssetTypeDef } from '../../types'
import { useSaveGuard } from '../../hooks/useSaveGuard'

type SaveData = Omit<AssetAccount, 'id' | 'uid' | 'paymentDay' | 'maturityDate'> & { paymentDay?: number | null; maturityDate?: string | null }

interface Props {
  account?: AssetAccount
  currentAmount?: number
  assetTypes: AssetTypeDef[]
  onSave: (data: SaveData, amount: number | undefined) => void | Promise<void>
  onClose: () => void
}

export default function AssetAccountModal({ account, currentAmount, assetTypes, onSave, onClose }: Props) {
  const [label, setLabel] = useState(account?.label ?? '')
  const [type, setType] = useState(account?.type ?? assetTypes[0]?.id ?? '')
  const [liquid, setLiquid] = useState(account?.liquid ?? true)
  const [amount, setAmount] = useState(currentAmount?.toString() ?? '')
  const [paymentDay, setPaymentDay] = useState(account?.paymentDay?.toString() ?? '')
  const [maturityDate, setMaturityDate] = useState(account?.maturityDate ?? '')

  const { saving, runSave } = useSaveGuard()

  const handleSave = () => {
    if (!label.trim() || Number(amount) < 0) return
    const isEdit = !!account
    const data: SaveData = {
      label: label.trim(),
      type,
      liquid,
      order: account?.order ?? 0,
      paymentDay: paymentDay ? Number(paymentDay) : (isEdit ? null : undefined),
      maturityDate: maturityDate || (isEdit ? null : undefined),
    }
    runSave(() => onSave(data, amount ? Number(amount) : undefined))
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal">
        <div className="modal-header">
          <h3>{account ? '자산 계좌 수정' : '자산 계좌 추가'}</h3>
          <button className="modal-close" onClick={onClose} aria-label="닫기">✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="asset-label">계좌명 <span className="required">*</span></label>
            <input id="asset-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="세이프박스, 청년도약계좌 등" autoFocus />
          </div>
          <div className="form-group">
            <label>종류</label>
            <CustomSelect
              name="종류"
              value={type}
              options={assetTypes.map(t => ({ value: t.id, label: t.label }))}
              onChange={setType}
            />
          </div>
          <div className="form-group">
            <label>유동성</label>
            <div style={{ display: 'flex', gap: 8 }} role="group" aria-label="유동성">
              <button type="button" className={`btn ${liquid ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }} onClick={() => setLiquid(true)}>유동 자산</button>
              <button type="button" className={`btn ${!liquid ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }} onClick={() => setLiquid(false)}>비유동 자산</button>
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="asset-amount">현재 금액</label>
            <input id="asset-amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" min={0} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <div className="optional-label-row">
                <label htmlFor="asset-day">납입일</label>
                {paymentDay && <button type="button" className="clear-btn" aria-label="납입일 지우기" onClick={() => setPaymentDay('')}>지우기</button>}
              </div>
              <input id="asset-day" type="number" value={paymentDay} onChange={(e) => setPaymentDay(e.target.value)} placeholder="매월 N일 (선택)" min={1} max={31} />
            </div>
            <div className="form-group">
              <div className="optional-label-row">
                <label htmlFor="asset-maturity">만기일</label>
                {maturityDate && <button type="button" className="clear-btn" aria-label="만기일 지우기" onClick={() => setMaturityDate('')}>지우기</button>}
              </div>
              <input
                id="asset-maturity"
                type="date"
                value={maturityDate}
                onChange={(e) => setMaturityDate(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !label.trim() || Number(amount) < 0}>{saving ? '저장 중…' : '저장'}</button>
        </div>
      </div>
    </Modal>
  )
}
