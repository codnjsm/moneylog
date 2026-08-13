import { useState } from 'react'
import type { StockCategoryDef, StockTrade } from '../../types'
import CustomSelect from '../CustomSelect'
import { fmtNum, stockProfitOf, stockProfitPercentOf, fmtStockPercent, signColor, percentColor } from '../../utils'

interface Props {
  trades: StockTrade[]
  categories: StockCategoryDef[]
  onAdd: () => void
  onEdit: (trade: StockTrade) => void
  onEditCategories: () => void
}

export default function StockTab({ trades, categories, onAdd, onEdit, onEditCategories }: Props) {
  const [filterCategory, setFilterCategory] = useState('all')

  const filtered = filterCategory === 'all' ? trades : trades.filter(t => t.category === filterCategory)
  const totalProfit = filtered.reduce((s, t) => s + stockProfitOf(t), 0)
  const categoryOptions = [
    { value: 'all', label: '구분 전체' },
    ...categories.map(c => ({ value: c.id, label: c.label })),
  ]

  return (
    <div className="tab-content">
      <div className="dash-section dash-remaining-section">
        <div className="dash-remaining-item">
          <span className="dash-section-title">이번 달 주식 수익</span>
          <span className="dash-remaining-value" style={{ color: signColor(totalProfit) }}>
            {totalProfit < 0 ? '−' : ''}{fmtNum(Math.abs(totalProfit))}원
          </span>
        </div>
      </div>

      <div className="filter-row-wrap">
        <CustomSelect
          value={filterCategory}
          options={categoryOptions}
          onChange={setFilterCategory}
          action={{ label: '구분 편집', onClick: onEditCategories }}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>주식 거래 내역이 없어요</p>
          <p className="empty-sub">아래 + 버튼으로 추가하세요</p>
        </div>
      ) : (
        <div className="expense-list">
          {filtered.map((t) => {
            const profit = stockProfitOf(t)
            const percent = stockProfitPercentOf(t)
            const cat = categories.find(c => c.id === t.category)
            const color = cat?.color ?? '#94A3B8'
            return (
              <div key={t.id} className="expense-card" onClick={() => onEdit(t)}>
                <div className="expense-card-row1">
                  <div className="expense-badges">
                    <span className="category-badge" style={{ color, background: color + '26' }}>{cat?.label ?? t.category}</span>
                    <span className="method-badge" style={{ color: '#94A3B8', background: '#94A3B826' }}>{t.quantity}주</span>
                  </div>
                  <div className="expense-date">{t.sellDate.slice(5).replace('-', '/')}</div>
                </div>
                <div className="expense-card-row2">
                  <div className="expense-label">{t.label}</div>
                  <div className="expense-amount" style={{ color: signColor(profit) }}>
                    {profit < 0 ? '−' : ''}{fmtNum(Math.abs(profit))}원 <span style={{ fontSize: 12, fontWeight: 400, color: percentColor(percent) }}>({fmtStockPercent(percent)})</span>
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
