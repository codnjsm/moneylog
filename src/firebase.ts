import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, type User } from 'firebase/auth'
import {
  getFirestore, collection, doc, setDoc, addDoc, updateDoc, deleteDoc,
  query, where, onSnapshot, getDoc, getDocs, arrayUnion, arrayRemove, limit, deleteField, type Unsubscribe,
} from 'firebase/firestore'
import type { FixedItem, SavingsItem, Expense, MonthlyIncome, AssetAccount, AssetSnapshot, IncomeItem, UserProfile, PaymentMethodDef, CategoryDef, AssetTypeDef, StockTrade } from './types'

const firebaseConfig = {
  apiKey: 'AIzaSyA7jMyOyO_FCqXoGouKwDKBpfnBhvFk2LY',
  authDomain: 'moneylog-3c3d6.firebaseapp.com',
  projectId: 'moneylog-3c3d6',
  storageBucket: 'moneylog-3c3d6.firebasestorage.app',
  messagingSenderId: '380428394736',
  appId: '1:380428394736:web:810d4039adfe5530f4e235',
  measurementId: 'G-GR7EHDDR41',
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

const provider = new GoogleAuthProvider()
provider.setCustomParameters({ prompt: 'select_account' })

export const signIn = () => signInWithPopup(auth, provider).then((r) => r.user)
export const signOutUser = () => signOut(auth)
export const onAuth = (cb: (user: User | null) => void) => onAuthStateChanged(auth, cb)

// ── Fixed Items ──────────────────────────────────────────────
// ── Fixed Items (monthly) ─────────────────────────────────────
export const subscribeFixedItemsMonthly = (uid: string, yearMonth: string, cb: (items: FixedItem[] | null) => void): Unsubscribe =>
  onSnapshot(doc(db, 'fixed_monthly', `${uid}_${yearMonth}`), (s) =>
    cb(s.exists() ? (s.data().items as FixedItem[]) : null))

export const setFixedItemsMonthly = (uid: string, yearMonth: string, items: FixedItem[]) =>
  setDoc(doc(db, 'fixed_monthly', `${uid}_${yearMonth}`), { uid, yearMonth, items })

export const getFixedItemsFallback = async (uid: string, yearMonth: string): Promise<FixedItem[]> => {
  for (let i = 1; i <= 12; i++) {
    const d = new Date(yearMonth + '-01')
    d.setMonth(d.getMonth() - i)
    const ym = d.toISOString().slice(0, 7)
    const snap = await getDoc(doc(db, 'fixed_monthly', `${uid}_${ym}`))
    if (snap.exists()) return snap.data().items as FixedItem[]
  }
  const snap = await getDocs(query(collection(db, 'fixed_items'), where('uid', '==', uid)))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as FixedItem)).sort((a, b) => a.order - b.order)
}

// ── Savings Items (monthly) ───────────────────────────────────
export const subscribeSavingsItemsMonthly = (uid: string, yearMonth: string, cb: (items: SavingsItem[] | null) => void): Unsubscribe =>
  onSnapshot(doc(db, 'savings_monthly', `${uid}_${yearMonth}`), (s) =>
    cb(s.exists() ? (s.data().items as SavingsItem[]) : null))

export const setSavingsItemsMonthly = (uid: string, yearMonth: string, items: SavingsItem[]) =>
  setDoc(doc(db, 'savings_monthly', `${uid}_${yearMonth}`), { uid, yearMonth, items })

export const getSavingsItemsFallback = async (uid: string, yearMonth: string): Promise<SavingsItem[]> => {
  for (let i = 1; i <= 12; i++) {
    const d = new Date(yearMonth + '-01')
    d.setMonth(d.getMonth() - i)
    const ym = d.toISOString().slice(0, 7)
    const snap = await getDoc(doc(db, 'savings_monthly', `${uid}_${ym}`))
    if (snap.exists()) return snap.data().items as SavingsItem[]
  }
  const snap = await getDocs(query(collection(db, 'savings_items'), where('uid', '==', uid)))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as SavingsItem)).sort((a, b) => a.label.localeCompare(b.label))
}

// ── Expenses ─────────────────────────────────────────────────
export const subscribeExpenses = (uid: string, yearMonth: string, cb: (items: Expense[]) => void): Unsubscribe =>
  onSnapshot(query(collection(db, 'expenses'), where('uid', '==', uid), where('yearMonth', '==', yearMonth)), (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Expense)).sort((a, b) => {
      const dateDiff = b.date.localeCompare(a.date)
      if (dateDiff !== 0) return dateDiff
      return (a.createdAt ?? 0) - (b.createdAt ?? 0)
    })))

export const addExpense = (uid: string, data: Omit<Expense, 'id' | 'uid'>) =>
  addDoc(collection(db, 'expenses'), { ...data, uid, createdAt: Date.now() })

export const updateExpense = (id: string, data: Partial<Omit<Expense, 'id' | 'uid'>>) =>
  updateDoc(doc(db, 'expenses', id), data)

export const deleteExpense = (id: string) => deleteDoc(doc(db, 'expenses', id))

export const subscribeExpensesExist = (uid: string, yearMonth: string, cb: (exists: boolean) => void): Unsubscribe =>
  onSnapshot(query(collection(db, 'expenses'), where('uid', '==', uid), where('yearMonth', '==', yearMonth), limit(1)), (snap) => cb(!snap.empty))

export const deleteExpensesByGroupId = async (uid: string, groupId: string) => {
  const snap = await getDocs(query(collection(db, 'expenses'), where('uid', '==', uid), where('installmentGroupId', '==', groupId)))
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)))
}

// ── Monthly Income ────────────────────────────────────────────
export const subscribeMonthlyIncome = (uid: string, yearMonth: string, cb: (income: MonthlyIncome | null) => void): Unsubscribe =>
  onSnapshot(doc(db, 'monthly_income', `${uid}_${yearMonth}`), (snap) =>
    cb(snap.exists() ? (snap.data() as MonthlyIncome) : null))

export const setMonthlyIncome = (uid: string, yearMonth: string, items: IncomeItem[]) =>
  setDoc(doc(db, 'monthly_income', `${uid}_${yearMonth}`), { uid, yearMonth, items })

// ── Stock Trades ───────────────────────────────────────────────
export const subscribeStockTrades = (uid: string, yearMonth: string, cb: (items: StockTrade[]) => void): Unsubscribe =>
  onSnapshot(query(collection(db, 'stock_trades'), where('uid', '==', uid), where('yearMonth', '==', yearMonth)), (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as StockTrade)).sort((a, b) => b.sellDate.localeCompare(a.sellDate))))

export const addStockTrade = (uid: string, data: Omit<StockTrade, 'id' | 'uid'>) =>
  addDoc(collection(db, 'stock_trades'), { ...data, uid, createdAt: Date.now() })

export const updateStockTrade = (id: string, data: Partial<Omit<StockTrade, 'id' | 'uid'>>) =>
  updateDoc(doc(db, 'stock_trades', id), data)

export const deleteStockTrade = (id: string) => deleteDoc(doc(db, 'stock_trades', id))

// ── Asset Accounts ────────────────────────────────────────────
export const subscribeAssetAccounts = (uid: string, cb: (accounts: AssetAccount[]) => void): Unsubscribe =>
  onSnapshot(query(collection(db, 'asset_accounts'), where('uid', '==', uid)), (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AssetAccount)).sort((a, b) => a.order - b.order)))

export const addAssetAccount = (uid: string, data: Omit<AssetAccount, 'id' | 'uid'>) =>
  addDoc(collection(db, 'asset_accounts'), { ...data, uid })

export const updateAssetAccount = (id: string, data: Omit<AssetAccount, 'id' | 'uid' | 'paymentDay' | 'maturityDate'> & { paymentDay?: number | null; maturityDate?: string | null }) => {
  const updates: Record<string, unknown> = { label: data.label, type: data.type, order: data.order, liquid: data.liquid ?? true }
  if ('paymentDay' in data) updates.paymentDay = data.paymentDay == null ? deleteField() : data.paymentDay
  if ('maturityDate' in data) updates.maturityDate = data.maturityDate == null ? deleteField() : data.maturityDate
  return updateDoc(doc(db, 'asset_accounts', id), updates)
}

export const deleteAssetAccount = (id: string) => deleteDoc(doc(db, 'asset_accounts', id))

// ── Asset Snapshots ───────────────────────────────────────────
export const subscribeAssetSnapshot = (uid: string, yearMonth: string, cb: (snap: AssetSnapshot | null) => void): Unsubscribe =>
  onSnapshot(doc(db, 'asset_snapshots', `${uid}_${yearMonth}`), (s) =>
    cb(s.exists() ? (s.data() as AssetSnapshot) : null))

export const setAssetSnapshot = (uid: string, yearMonth: string, amounts: Record<string, number>, asOf: string) =>
  setDoc(doc(db, 'asset_snapshots', `${uid}_${yearMonth}`), { uid, yearMonth, amounts, asOf })

// ── Payment Methods ───────────────────────────────────────────

export const subscribePaymentMethods = (uid: string, cb: (methods: PaymentMethodDef[] | null) => void): Unsubscribe =>
  onSnapshot(doc(db, 'payment_labels', uid), (s) => {
    if (!s.exists()) { cb(null); return }
    const data = s.data()
    cb(Array.isArray(data.methods) ? (data.methods as PaymentMethodDef[]) : null)
  })

export const setPaymentMethods = (uid: string, methods: PaymentMethodDef[]) =>
  setDoc(doc(db, 'payment_labels', uid), { methods })

// ── Expense Categories ────────────────────────────────────────
export const subscribeCategories = (uid: string, cb: (cats: CategoryDef[] | null) => void): Unsubscribe =>
  onSnapshot(doc(db, 'expense_categories', uid), (s) => {
    if (!s.exists()) { cb(null); return }
    const data = s.data()
    cb(Array.isArray(data.categories) ? (data.categories as CategoryDef[]) : null)
  })

export const setCategories = (uid: string, categories: CategoryDef[]) =>
  setDoc(doc(db, 'expense_categories', uid), { categories })

// ── Asset Types ───────────────────────────────────────────────
export const subscribeAssetTypes = (uid: string, cb: (types: AssetTypeDef[] | null) => void): Unsubscribe =>
  onSnapshot(doc(db, 'asset_types', uid), (s) => {
    if (!s.exists()) { cb(null); return }
    const data = s.data()
    cb(Array.isArray(data.types) ? (data.types as AssetTypeDef[]) : null)
  })

export const setAssetTypes = (uid: string, types: AssetTypeDef[]) =>
  setDoc(doc(db, 'asset_types', uid), { types })

// ── Data Export ──────────────────────────────────────────────
export const exportAllData = async (uid: string) => {
  const [
    expensesSnap,
    fixedMonthlySnap,
    savingsMonthlySnap,
    incomeSnap,
    assetAccountsSnap,
    assetSnapshotsSnap,
    paymentMethodsSnap,
    categoriesSnap,
    assetTypesSnap,
    stockTradesSnap,
  ] = await Promise.all([
    getDocs(query(collection(db, 'expenses'), where('uid', '==', uid))),
    getDocs(query(collection(db, 'fixed_monthly'), where('uid', '==', uid))),
    getDocs(query(collection(db, 'savings_monthly'), where('uid', '==', uid))),
    getDocs(query(collection(db, 'monthly_income'), where('uid', '==', uid))),
    getDocs(query(collection(db, 'asset_accounts'), where('uid', '==', uid))),
    getDocs(query(collection(db, 'asset_snapshots'), where('uid', '==', uid))),
    getDoc(doc(db, 'payment_labels', uid)),
    getDoc(doc(db, 'expense_categories', uid)),
    getDoc(doc(db, 'asset_types', uid)),
    getDocs(query(collection(db, 'stock_trades'), where('uid', '==', uid))),
  ])

  return {
    exportedAt: new Date().toISOString(),
    uid,
    expenses: expensesSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    fixedMonthly: fixedMonthlySnap.docs.map(d => ({ id: d.id, ...d.data() })),
    savingsMonthly: savingsMonthlySnap.docs.map(d => ({ id: d.id, ...d.data() })),
    monthlyIncome: incomeSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    assetAccounts: assetAccountsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    assetSnapshots: assetSnapshotsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    paymentMethods: paymentMethodsSnap.exists() ? paymentMethodsSnap.data() : null,
    categories: categoriesSnap.exists() ? categoriesSnap.data() : null,
    assetTypes: assetTypesSnap.exists() ? assetTypesSnap.data() : null,
    stockTrades: stockTradesSnap.docs.map(d => ({ id: d.id, ...d.data() })),
  }
}

// ── User Profiles ─────────────────────────────────────────────
export const subscribeUserProfile = (uid: string, cb: (profile: UserProfile | null) => void): Unsubscribe =>
  onSnapshot(doc(db, 'user_profiles', uid), (s) =>
    cb(s.exists() ? (s.data() as UserProfile) : null))

export const setUserProfile = (uid: string, data: Partial<UserProfile>) =>
  setDoc(doc(db, 'user_profiles', uid), data, { merge: true })

// ── Households ────────────────────────────────────────────────
export const createHousehold = async (uid: string): Promise<string> => {
  const code = Math.random().toString(36).substr(2, 6).toUpperCase()
  await setDoc(doc(db, 'households', code), { code, createdBy: uid, members: [uid] })
  return code
}

export const joinHousehold = async (uid: string, code: string): Promise<boolean> => {
  const ref = doc(db, 'households', code.toUpperCase())
  const snap = await getDoc(ref)
  if (!snap.exists()) return false
  await updateDoc(ref, { members: arrayUnion(uid) })
  return true
}

export const leaveHousehold = async (uid: string, code: string): Promise<void> => {
  await updateDoc(doc(db, 'households', code), { members: arrayRemove(uid) })
}
