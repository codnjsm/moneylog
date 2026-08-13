export const fmtWon = (n: number) => n.toLocaleString('ko-KR') + '원'
export const fmtNum = (n: number) => n.toLocaleString('ko-KR')

interface StockLike {
  buyPrice: number
  sellPrice: number
  quantity: number
}

export const stockProfitOf = (t: StockLike) => (t.sellPrice - t.buyPrice) * t.quantity

export const stockProfitPercentOf = (t: Pick<StockLike, 'buyPrice' | 'sellPrice'>) =>
  t.buyPrice === 0 ? null : ((t.sellPrice - t.buyPrice) / t.buyPrice) * 100

const MAX_PERCENT_MAGNITUDE = 9999

export const fmtStockPercent = (p: number | null) => {
  if (p === null) return '—'
  if (p === 0) return '0.0%'
  const abs = Math.abs(p)
  const sign = p < 0 ? '−' : '+'
  return abs > MAX_PERCENT_MAGNITUDE ? `${sign}${MAX_PERCENT_MAGNITUDE}%+` : `${sign}${abs.toFixed(1)}%`
}

export const signColor = (n: number) => n === 0 ? 'var(--text-dim)' : n < 0 ? 'var(--accent)' : 'var(--danger)'
export const percentColor = (p: number | null) => p === null ? 'var(--text-dim)' : signColor(p)
