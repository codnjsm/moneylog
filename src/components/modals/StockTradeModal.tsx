import { useState } from 'react'
import Modal from '../Modal'
import CustomSelect from '../CustomSelect'
import type { StockCategory, StockCategoryDef, StockTrade } from '../../types'

interface Props {
  trade?: StockTrade
  categories: StockCategoryDef[]
  onSave: (data: Omit<StockTrade, 'id' | 'uid' | 'yearMonth' | 'linkedExpenseId'>) => void
  onDelete?: () => void
  onClose: () => void
}

export default function StockTradeModal({ trade, categories, onSave, onDelete, onClose }: Props) {
  const today = new Date().toISOString().slice(0, 10)
  const categoryOptions = categories.map(c => ({ value: c.id, label: c.label }))

  const [label, setLabel] = useState(trade?.label ?? '')
  const [category, setCategory] = useState<StockCategory>(trade?.category ?? categories[0]?.id ?? '')
  const [buyPrice, setBuyPrice] = useState(trade?.buyPrice?.toString() ?? '')
  const [sellPrice, setSellPrice] = useState(trade?.sellPrice?.toString() ?? '')
  const [quantity, setQuantity] = useState(trade?.quantity?.toString() ?? '')
  const [sellDate, setSellDate] = useState(trade?.sellDate ?? today)

  const profit = (Number(sellPrice) - Number(buyPrice)) * Number(quantity)
  const profitPercent = Number(buyPrice) === 0 ? null : ((Number(sellPrice) - Number(buyPrice)) / Number(buyPrice)) * 100
  const profitPercentText = profitPercent === null ? '—' : profitPercent === 0 ? '0.0%' : `${profitPercent < 0 ? '−' : '+'}${Math.abs(profitPercent).toFixed(1)}%`
  const signColor = (n: number) => n === 0 ? 'var(--text-dim)' : n < 0 ? 'var(--accent)' : 'var(--danger)'
  const profitPercentColor = profitPercent === null ? 'var(--text-dim)' : signColor(profitPercent)
  const valid = !!label.trim() && Number(buyPrice) > 0 && !!sellPrice && Number(quantity) > 0 && !!sellDate

  const handleSave = () => {
    if (!valid) return
    onSave({ label: label.trim(), category, buyPrice: Number(buyPrice), sellPrice: Number(sellPrice), quantity: Number(quantity), sellDate })
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal" onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing && (e.target as HTMLElement).tagName !== 'BUTTON') handleSave() }}>
        <div className="modal-header">
          <h3>{trade ? '주식 거래 수정' : '주식 거래 추가'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>구분</label>
            <CustomSelect value={category} options={categoryOptions} onChange={(v) => setCategory(v as StockCategory)} />
          </div>
          <div className="form-group">
            <label>종목명 <span className="required">*</span></label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="예: 삼성전자, OO공모주" autoFocus />
          </div>
          <div className="form-group">
            <label>매수 단가 <span className="required">*</span></label>
            <input type="number" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} placeholder="0" min={0} />
          </div>
          <div className="form-group">
            <label>매도 단가 <span className="required">*</span></label>
            <input type="number" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} placeholder="0" min={0} />
          </div>
          <div className="form-group">
            <label>수량 <span className="required">*</span></label>
            <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" min={0} />
          </div>
          <div className="form-group">
            <label>매도일 <span className="required">*</span></label>
            <input type="date" value={sellDate} onChange={(e) => setSellDate(e.target.value)} max={today} />
          </div>
          {buyPrice && sellPrice && quantity && (
            <div className="form-group">
              <label>예상 수익</label>
              <div style={{ fontWeight: 700, color: signColor(profit) }}>
                {profit < 0 ? '−' : ''}{Math.abs(profit).toLocaleString('ko-KR')}원 <span style={{ fontSize: 12, fontWeight: 400, color: profitPercentColor }}>({profitPercentText})</span>
              </div>
            </div>
          )}
          {trade && onDelete && (
            <button className="modal-delete-link" onClick={() => { if (confirm('삭제할까요?')) onDelete() }}>항목 삭제</button>
          )}
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!valid}>저장</button>
        </div>
      </div>
    </Modal>
  )
}
