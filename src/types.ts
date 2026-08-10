export type PaymentMethod = string

export interface UserProfile {
  householdCode: string | null
  mode: 'personal' | 'shared'
}

export interface Household {
  code: string
  createdBy: string
  members: string[]
}

export interface PaymentMethodDef {
  id: string
  label: string
  color: string
}

export const METHOD_COLORS = [
  '#4FA3E0', '#34D399', '#FBBF24', '#A78BFA',
  '#F472B6', '#F87171', '#FB923C', '#94A3B8',
]

export const DEFAULT_PAYMENT_METHODS: PaymentMethodDef[] = [
  { id: 'samsung', label: '삼성 카드', color: '#4FA3E0' },
  { id: 'woori', label: '우리 카드', color: '#34D399' },
  { id: 'cash', label: '현금', color: '#FBBF24' },
  { id: 'special', label: '특별 지출', color: '#A78BFA' },
  { id: 'safebox', label: '세이프박스', color: '#F472B6' },
]

export interface IncomeItem {
  id: string
  label: string
  amount: number
}

export interface FixedItem {
  id: string
  uid: string
  label: string
  amount: number
  order: number
  paymentDay?: number
}

export interface SavingsItem {
  id: string
  uid: string
  label: string
  amount: number
  paymentDay?: number
  maturityDate?: string
}

export interface CategoryDef {
  id: string
  label: string
  color: string
}

export const DEFAULT_CATEGORIES: CategoryDef[] = [
  { id: 'food', label: '식비', color: '#F87171' },
  { id: 'transport', label: '교통', color: '#4FA3E0' },
  { id: 'shopping', label: '쇼핑', color: '#FBBF24' },
  { id: 'culture', label: '문화', color: '#A78BFA' },
  { id: 'medical', label: '의료', color: '#34D399' },
  { id: 'housing', label: '주거', color: '#FB923C' },
  { id: 'other', label: '기타', color: '#94A3B8' },
]

export interface Expense {
  id: string
  uid: string
  yearMonth: string
  date: string
  label: string
  amount: number
  paymentMethod: PaymentMethod
  type?: 'expense' | 'income'
  category?: string
  installmentGroupId?: string
  createdAt?: number
}

export interface MonthlyIncome {
  uid: string
  yearMonth: string
  items: IncomeItem[]
}

export type AssetType = string

export interface AssetTypeDef {
  id: string
  label: string
  color: string
}

export const DEFAULT_ASSET_TYPES: AssetTypeDef[] = [
  { id: 'bank', label: '은행', color: '#4FA3E0' },
  { id: 'savings', label: '적금', color: '#34D399' },
  { id: 'stock', label: '주식', color: '#FBBF24' },
  { id: 'isa', label: 'ISA', color: '#A78BFA' },
  { id: 'other', label: '기타', color: '#94A3B8' },
]

export interface AssetAccount {
  id: string
  uid: string
  label: string
  type: AssetType
  liquid?: boolean
  paymentDay?: number
  maturityDate?: string
  order: number
}

export interface AssetSnapshot {
  uid: string
  yearMonth: string
  amounts: Record<string, number>
  asOf: string
}

export type StockCategory = string

export interface StockCategoryDef {
  id: string
  label: string
  color: string
}

export const DEFAULT_STOCK_CATEGORIES: StockCategoryDef[] = [
  { id: 'ipo', label: '공모주', color: '#4FA3E0' },
  { id: 'stock', label: '주식', color: '#34D399' },
  { id: 'etf', label: 'ETF', color: '#FBBF24' },
]

export interface StockTrade {
  id: string
  uid: string
  yearMonth: string
  label: string
  category: StockCategory
  buyPrice: number
  sellPrice: number
  quantity: number
  sellDate: string
  linkedExpenseId?: string
  createdAt?: number
}
