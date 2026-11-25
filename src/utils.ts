import type { CSSProperties } from 'react'

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

// 납입일은 1~31 만 허용한다. <input min max> 는 <form> 없이 onClick 으로 저장하는
// 이 프로젝트 구조에서 전혀 작동하지 않으니, 저장 전에 여기서 직접 걸러야 한다.
export const isPaymentDay = (n: number) => Number.isInteger(n) && n >= 1 && n <= 31

export const badgeStyle = (color: string) => ({ '--badge': color }) as CSSProperties

export const signColor = (n: number) => n === 0 ? 'var(--text-dim)' : n < 0 ? 'var(--accent)' : 'var(--danger)'
export const percentColor = (p: number | null) => p === null ? 'var(--text-dim)' : signColor(p)
