import { useState } from 'react'
import Modal from '../Modal'
import CustomSelect from '../CustomSelect'
import type { AssetAccount, AssetTypeDef } from '../../types'

type SaveData = Omit<AssetAccount, 'id' | 'uid' | 'paymentDay' | 'maturityDate'> & { paymentDay?: number | null; maturityDate?: string | null }

interface Props {
  account?: AssetAccount
  currentAmount?: number
  assetTypes: AssetTypeDef[]
  onSave: (data: SaveData, amount: number | undefined) => void
  onClose: () => void
}

export default function AssetAccountModal({ account, currentAmount, assetTypes, onSave, onClose }: Props) {
  const [label, setLabel] = useState(account?.label ?? '')
  const [type, setType] = useState(account?.type ?? assetTypes[0]?.id ?? '')
  const [liquid, setLiquid] = useState(account?.liquid ?? true)
  const [amount, setAmount] = useState(currentAmount?.toString() ?? '')
  const [paymentDay, setPaymentDay] = useState(account?.paymentDay?.toString() ?? '')
  const [maturityDate, setMaturityDate] = useState(account?.maturityDate ?? '')

  const handleSave = () => {
    if (!label.trim()) return
    const isEdit = !!account
    const data: SaveData = {
      label: label.trim(),
      type,
      liquid,
      order: account?.order ?? 0,
      paymentDay: paymentDay ? Number(paymentDay) : (isEdit ? null : undefined),
      maturityDate: maturityDate || (isEdit ? null : undefined),
    }
    onSave(data, amount ? Number(amount) : undefined)
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal">
        <div className="modal-header">
          <h3>{account ? '자산 계좌 수정' : '자산 계좌 추가'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>계좌명 <span className="required">*</span></label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="세이프박스, 청년도약계좌 등" autoFocus />
          </div>
          <div className="form-group">
            <label>종류</label>
            <CustomSelect
              value={type}
              options={assetTypes.map(t => ({ value: t.id, label: t.label }))}
              onChange={setType}
            />
          </div>
          <div className="form-group">
            <label>유동성</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className={`btn ${liquid ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }} onClick={() => setLiquid(true)}>유동 자산</button>
              <button type="button" className={`btn ${!liquid ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }} onClick={() => setLiquid(false)}>비유동 자산</button>
            </div>
          </div>
          <div className="form-group">
            <label>현재 금액</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" min={0} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <div className="optional-label-row">
                <label>납입일</label>
                {paymentDay && <button type="button" className="clear-btn" onClick={() => setPaymentDay('')}>지우기</button>}
              </div>
              <input type="number" value={paymentDay} onChange={(e) => setPaymentDay(e.target.value)} placeholder="매월 N일 (선택)" min={1} max={31} />
            </div>
            <div className="form-group">
              <div className="optional-label-row">
                <label>만기일</label>
                {maturityDate && <button type="button" className="clear-btn" onClick={() => setMaturityDate('')}>지우기</button>}
              </div>
              <input
                type="date"
                value={maturityDate}
                onChange={(e) => setMaturityDate(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!label.trim()}>저장</button>
        </div>
      </div>
    </Modal>
  )
}
