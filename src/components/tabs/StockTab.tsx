import { STOCK_CATEGORY_LABELS, type StockTrade } from '../../types'

interface Props {
  trades: StockTrade[]
  onAdd: () => void
  onEdit: (trade: StockTrade) => void
}

const fmt = (n: number) => n.toLocaleString('ko-KR')
const profitOf = (t: StockTrade) => (t.sellPrice - t.buyPrice) * t.quantity

export default function StockTab({ trades, onAdd, onEdit }: Props) {
  const totalProfit = trades.reduce((s, t) => s + profitOf(t), 0)

  return (
    <div className="tab-content">
      <div className="dash-section dash-remaining-section">
        <div className="dash-remaining-item">
          <span className="dash-section-title">이번 달 주식 수익</span>
          <span className={`dash-remaining-value${totalProfit < 0 ? ' expense' : ' income'}`}>
            {totalProfit < 0 ? '−' : ''}{fmt(Math.abs(totalProfit))}원
          </span>
        </div>
      </div>

      {trades.length === 0 ? (
        <div className="empty-state">
          <p>주식 거래 내역이 없어요</p>
          <p className="empty-sub">아래 + 버튼으로 추가하세요</p>
        </div>
      ) : (
        <div className="expense-list">
          {trades.map((t) => {
            const profit = profitOf(t)
            return (
              <div key={t.id} className="expense-card" onClick={() => onEdit(t)}>
                <div className="expense-card-row1">
                  <div className="expense-badges">
                    <span className="category-badge" style={{ color: '#4FA3E0', background: '#4FA3E026' }}>{STOCK_CATEGORY_LABELS[t.category] ?? '주식'}</span>
                    <span className="method-badge" style={{ color: '#94A3B8', background: '#94A3B826' }}>{t.quantity}주</span>
                  </div>
                  <div className="expense-date">{t.sellDate.slice(5).replace('-', '/')}</div>
                </div>
                <div className="expense-card-row2">
                  <div className="expense-label">{t.label}</div>
                  <div className={`expense-amount${profit < 0 ? ' expense' : ' income'}`}>
                    {profit < 0 ? '−' : ''}{fmt(Math.abs(profit))}원
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <button className="fab" onClick={onAdd}>+</button>
    </div>
  )
}
