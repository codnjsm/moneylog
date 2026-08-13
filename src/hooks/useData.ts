import { useState, useEffect } from 'react'
import type { FixedItem, SavingsItem, Expense, MonthlyIncome, AssetAccount, AssetSnapshot, IncomeItem, PaymentMethodDef, CategoryDef, AssetTypeDef, StockTrade, StockCategoryDef } from '../types'
import { DEFAULT_PAYMENT_METHODS, DEFAULT_CATEGORIES, DEFAULT_ASSET_TYPES, DEFAULT_STOCK_CATEGORIES } from '../types'
import { stockProfitOf } from '../utils'
import {
  subscribeFixedItemsMonthly, setFixedItemsMonthly, getFixedItemsFallback,
  subscribeSavingsItemsMonthly, setSavingsItemsMonthly, getSavingsItemsFallback,
  subscribeExpenses, addExpense, updateExpense, deleteExpense, deleteExpensesByGroupId, subscribeExpensesExist,
  subscribeMonthlyIncome, setMonthlyIncome,
  subscribeStockTrades, addStockTradeWithExpense, updateStockTradeWithExpense, deleteStockTradeWithExpense,
  subscribeAssetAccountsMonthly, setAssetAccountsMonthly as firebaseSetAssetAccountsMonthly, getAssetAccountsFallback,
  subscribeAssetSnapshot, setAssetSnapshot as firebaseSetAssetSnapshot,
  subscribePaymentMethods, setPaymentMethods as firebaseSetPaymentMethods,
  subscribeCategories, setCategories as firebaseSetCategories,
  subscribeAssetTypes, setAssetTypes as firebaseSetAssetTypes,
  subscribeStockCategories, setStockCategories as firebaseSetStockCategories,
} from '../firebase'

export function useData(uid: string, yearMonth: string) {
  const [fixedMonthly, setFixedMonthly] = useState<FixedItem[] | null>(null)
  const [fixedFallback, setFixedFallback] = useState<FixedItem[]>([])
  const [savingsMonthly, setSavingsMonthly] = useState<SavingsItem[] | null>(null)
  const [savingsFallback, setSavingsFallback] = useState<SavingsItem[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [nextMonthHasData, setNextMonthHasData] = useState(false)
  const [income, setIncome] = useState<MonthlyIncome | null>(null)
  const [stockTrades, setStockTrades] = useState<StockTrade[]>([])
  const [assetAccountsMonthly, setAssetAccountsMonthly] = useState<AssetAccount[] | null>(null)
  const [assetAccountsFallback, setAssetAccountsFallback] = useState<AssetAccount[]>([])
  const [assetSnapshot, setAssetSnapshot] = useState<AssetSnapshot | null>(null)
  const [customMethods, setCustomMethods] = useState<PaymentMethodDef[] | null>(null)
  const [customCategories, setCustomCategories] = useState<CategoryDef[] | null>(null)
  const [customAssetTypes, setCustomAssetTypes] = useState<AssetTypeDef[] | null>(null)
  const [customStockCategories, setCustomStockCategories] = useState<StockCategoryDef[] | null>(null)

  useEffect(() => {
    if (!uid) return
    const u1 = subscribePaymentMethods(uid, setCustomMethods)
    const u2 = subscribeCategories(uid, setCustomCategories)
    const u3 = subscribeAssetTypes(uid, setCustomAssetTypes)
    const u4 = subscribeStockCategories(uid, setCustomStockCategories)
    return () => { u1(); u2(); u3(); u4() }
  }, [uid])

  const nextYearMonth = (() => {
    const [y, m] = yearMonth.split('-').map(Number)
    return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
  })()

  useEffect(() => {
    if (!uid) return
    setFixedMonthly(null)
    setSavingsMonthly(null)
    setAssetAccountsMonthly(null)
    const u1 = subscribeFixedItemsMonthly(uid, yearMonth, setFixedMonthly)
    const u2 = subscribeSavingsItemsMonthly(uid, yearMonth, setSavingsMonthly)
    const u3 = subscribeExpenses(uid, yearMonth, setExpenses)
    const u4 = subscribeMonthlyIncome(uid, yearMonth, setIncome)
    const u5 = subscribeAssetSnapshot(uid, yearMonth, setAssetSnapshot)
    const u6 = subscribeExpensesExist(uid, nextYearMonth, setNextMonthHasData)
    const u7 = subscribeStockTrades(uid, yearMonth, setStockTrades)
    const u8 = subscribeAssetAccountsMonthly(uid, yearMonth, setAssetAccountsMonthly)
    return () => { u1(); u2(); u3(); u4(); u5(); u6(); u7(); u8() }
  }, [uid, yearMonth])

  useEffect(() => {
    if (!uid || fixedMonthly !== null) return
    getFixedItemsFallback(uid, yearMonth).then(setFixedFallback)
  }, [uid, yearMonth, fixedMonthly])

  useEffect(() => {
    if (!uid || savingsMonthly !== null) return
    getSavingsItemsFallback(uid, yearMonth).then(setSavingsFallback)
  }, [uid, yearMonth, savingsMonthly])

  useEffect(() => {
    if (!uid || assetAccountsMonthly !== null) return
    getAssetAccountsFallback(uid, yearMonth).then(setAssetAccountsFallback)
  }, [uid, yearMonth, assetAccountsMonthly])

  const fixedItems: FixedItem[] = fixedMonthly ?? fixedFallback
  const savingsItems: SavingsItem[] = savingsMonthly ?? savingsFallback
  const assetAccounts: AssetAccount[] = assetAccountsMonthly ?? assetAccountsFallback
  const paymentMethods: PaymentMethodDef[] = customMethods ?? DEFAULT_PAYMENT_METHODS
  const categories: CategoryDef[] = customCategories ?? DEFAULT_CATEGORIES
  const assetTypes: AssetTypeDef[] = customAssetTypes ?? DEFAULT_ASSET_TYPES
  const stockCategories: StockCategoryDef[] = customStockCategories ?? DEFAULT_STOCK_CATEGORIES

  return {
    fixedItems, savingsItems, expenses, income, stockTrades, assetAccounts, assetSnapshot, paymentMethods, categories, assetTypes, stockCategories, nextMonthHasData,
    bulkSaveFixedItems: async (newItems: Array<{ id: string; label: string; amount: number; paymentDay?: number }>) => {
      const items: FixedItem[] = newItems.map((n, i) => ({
        id: n.id.startsWith('new-') ? Date.now().toString() + i : n.id,
        uid,
        label: n.label,
        amount: n.amount,
        order: i,
        ...(n.paymentDay ? { paymentDay: n.paymentDay } : {}),
      }))
      await setFixedItemsMonthly(uid, yearMonth, items)
    },
    bulkSaveSavingsItems: async (newItems: Array<{ id: string; label: string; amount: number; paymentDay?: number; maturityDate?: string }>) => {
      const items: SavingsItem[] = newItems.map((n, i) => ({
        id: n.id.startsWith('new-') ? Date.now().toString() + i : n.id,
        uid,
        label: n.label,
        amount: n.amount,
        order: i,
        ...(n.paymentDay ? { paymentDay: n.paymentDay } : {}),
        ...(n.maturityDate ? { maturityDate: n.maturityDate } : {}),
      }))
      await setSavingsItemsMonthly(uid, yearMonth, items)
    },
    addExpense: (data: Omit<Expense, 'id' | 'uid'>) => addExpense(uid, data),
    updateExpense,
    deleteExpense,
    deleteExpenseGroup: (groupId: string) => deleteExpensesByGroupId(uid, groupId),
    setIncome: (items: IncomeItem[]) => setMonthlyIncome(uid, yearMonth, items),
    addStockTrade: async (data: Omit<StockTrade, 'id' | 'uid' | 'yearMonth' | 'linkedExpenseId'>) => {
      const profit = stockProfitOf(data)
      const tradeYearMonth = data.sellDate.slice(0, 7)
      return addStockTradeWithExpense(
        uid,
        { ...data, yearMonth: tradeYearMonth },
        { yearMonth: tradeYearMonth, date: data.sellDate, label: `주식 수익 - ${data.label}`, amount: profit, paymentMethod: '', type: 'income' },
      )
    },
    updateStockTrade: async (id: string, linkedExpenseId: string | undefined, data: Omit<StockTrade, 'id' | 'uid' | 'yearMonth' | 'linkedExpenseId'>) => {
      const profit = stockProfitOf(data)
      const tradeYearMonth = data.sellDate.slice(0, 7)
      return updateStockTradeWithExpense(
        id,
        { ...data, yearMonth: tradeYearMonth },
        linkedExpenseId,
        { yearMonth: tradeYearMonth, date: data.sellDate, label: `주식 수익 - ${data.label}`, amount: profit },
      )
    },
    deleteStockTrade: async (id: string, linkedExpenseId?: string) => {
      return deleteStockTradeWithExpense(id, linkedExpenseId)
    },
    addAssetAccount: (data: Omit<AssetAccount, 'id' | 'uid' | 'paymentDay' | 'maturityDate'> & { paymentDay?: number | null; maturityDate?: string | null }) => {
      const { paymentDay, maturityDate, ...rest } = data
      const account: AssetAccount = { ...rest, id: Date.now().toString(), uid, order: assetAccounts.length }
      if (paymentDay != null) account.paymentDay = paymentDay
      if (maturityDate != null) account.maturityDate = maturityDate
      return firebaseSetAssetAccountsMonthly(uid, yearMonth, [...assetAccounts, account]).then(() => account)
    },
    updateAssetAccount: (id: string, data: Omit<AssetAccount, 'id' | 'uid' | 'paymentDay' | 'maturityDate'> & { paymentDay?: number | null; maturityDate?: string | null }) => {
      const { paymentDay, maturityDate, ...rest } = data
      const updated = assetAccounts.map((a) => {
        if (a.id !== id) return a
        const next: AssetAccount = { ...a, ...rest }
        if (paymentDay === null) delete next.paymentDay
        else if (paymentDay !== undefined) next.paymentDay = paymentDay
        if (maturityDate === null) delete next.maturityDate
        else if (maturityDate !== undefined) next.maturityDate = maturityDate
        return next
      })
      return firebaseSetAssetAccountsMonthly(uid, yearMonth, updated)
    },
    deleteAssetAccount: (id: string) =>
      firebaseSetAssetAccountsMonthly(uid, yearMonth, assetAccounts.filter((a) => a.id !== id)),
    setAssetSnapshot: (amounts: Record<string, number>, asOf: string) => firebaseSetAssetSnapshot(uid, yearMonth, amounts, asOf),
    setPaymentMethods: (methods: PaymentMethodDef[]) => firebaseSetPaymentMethods(uid, methods),
    setCategories: (cats: CategoryDef[]) => firebaseSetCategories(uid, cats),
    setAssetTypes: (types: AssetTypeDef[]) => firebaseSetAssetTypes(uid, types),
    setStockCategories: (categories: StockCategoryDef[]) => firebaseSetStockCategories(uid, categories),
  }
}
