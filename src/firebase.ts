import { initializeApp } from 'firebase/app'
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail,
  sendEmailVerification, updateProfile, deleteUser, type User,
} from 'firebase/auth'
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, setDoc, addDoc, updateDoc, deleteDoc, writeBatch,
  query, where, onSnapshot, getDoc, getDocs, arrayUnion, arrayRemove, limit, type Unsubscribe,
} from 'firebase/firestore'
import type { FixedItem, SavingsItem, Expense, MonthlyIncome, AssetAccount, AssetSnapshot, IncomeItem, UserProfile, PaymentMethodDef, CategoryDef, AssetTypeDef, StockTrade, StockCategoryDef } from './types'

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
// 인증 메일(가입 확인·비밀번호 재설정)을 한국어로 보낸다.
// 지정하지 않으면 Firebase 콘솔 템플릿의 기본 언어(영어)로 나간다.
auth.languageCode = 'ko'
// 로컬 캐시를 켜서 오프라인에서도 열리고, 월을 옮길 때 캐시부터 그린다.
// 탭 여러 개를 띄워도 캐시가 깨지지 않도록 multi-tab 매니저를 쓴다.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})

const provider = new GoogleAuthProvider()
provider.setCustomParameters({ prompt: 'select_account' })

/**
 * 이메일/비밀번호로 새 계정을 만든다. 가입 폼에서 받은 이름을 프로필에 직접 넣어줘야
 * 헤더 아바타와 더보기 화면에 이름이 뜬다 (구글 로그인과 달리 자동으로 안 채워진다).
 *
 * 가입 직후 인증 메일을 보낸다 — 주소를 잘못 적었으면 메일이 안 오는 걸로 바로 알 수 있고,
 * 나중에 비밀번호를 잊었을 때 재설정 메일을 받을 주소가 맞는지도 이때 확인된다.
 * 발송이 실패해도 가입 자체는 성공으로 두되, 화면에서 "보냈다"고 잘못 알리지 않도록
 * 성공 여부를 같이 돌려준다.
 *
 * 인증을 안 해도 앱은 그대로 쓸 수 있다 — firestore.rules 가 email_verified 를 보지 않는다.
 */
export const signUpWithEmail = async (
  name: string,
  email: string,
  password: string,
): Promise<{ user: User; verificationSent: boolean }> => {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(cred.user, { displayName: name })
  // user_profiles 에도 같이 넣는다. createUserWithEmailAndPassword 가 끝나는 순간 이미 로그인
  // 상태가 되어 onAuthStateChanged 가 displayName 이 빈 User 로 한 번 발화하는데,
  // 뒤이은 updateProfile 은 같은 User 객체를 제자리에서 고칠 뿐이라 리렌더를 일으키지 않는다.
  // 그래서 이 문서가 없으면 새로고침 전까지 이름이 '사용자'로 보인다.
  await updateUserName(cred.user.uid, name)
  let verificationSent = true
  try {
    await sendEmailVerification(cred.user)
  } catch {
    verificationSent = false
  }
  return { user: cred.user, verificationSent }
}

/**
 * 인증 메일을 다시 보낸다. 가입 때 signUpWithEmail 이 한 번 자동으로 보내므로,
 * 이건 "메일이 안 왔어요"로 다시 요청하는 경우에 쓴다.
 */
export const sendVerificationEmail = (): Promise<void> => {
  if (!auth.currentUser) return Promise.reject(new Error('로그인이 필요합니다'))
  return sendEmailVerification(auth.currentUser)
}

export const signInWithEmail = (email: string, password: string): Promise<User> =>
  signInWithEmailAndPassword(auth, email, password).then((r) => r.user)

export const sendPasswordReset = (email: string): Promise<void> => sendPasswordResetEmail(auth, email)

/**
 * 알릴 필요가 없는 코드. 사용자가 구글 팝업을 직접 닫은 것이라 본인이 이미 안다.
 * 게다가 Firebase 는 팝업이 닫혔는지 폴링으로 확인해 몇 초 늦게 알려주는데,
 * 그 사이 이메일 폼으로 넘어가 있으면 방금 입력하던 게 취소된 것처럼 읽힌다.
 */
const SILENT_AUTH_ERRORS = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request'])

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': '이미 가입된 이메일이에요',
  'auth/invalid-email': '이메일 형식이 올바르지 않아요',
  'auth/weak-password': '비밀번호는 6자 이상이어야 해요',
  'auth/wrong-password': '비밀번호가 맞지 않아요',
  'auth/invalid-credential': '이메일 또는 비밀번호가 맞지 않아요',
  'auth/user-not-found': '가입되지 않은 이메일이에요',
  'auth/too-many-requests': '너무 많이 시도했어요. 잠시 후 다시 시도해주세요',
  'auth/account-exists-with-different-credential': '이미 다른 방식으로 가입된 이메일이에요',
  'auth/network-request-failed': '네트워크 연결을 확인해주세요',
  'auth/operation-not-allowed': '이메일 로그인이 아직 켜져 있지 않아요',
}

/** 보여줄 메시지. null 이면 알릴 필요가 없는 에러다. */
export function authErrorMessage(err: unknown): string | null {
  const code = (err as { code?: string } | null | undefined)?.code
  if (code && SILENT_AUTH_ERRORS.has(code)) return null
  if (code && AUTH_ERROR_MESSAGES[code]) return AUTH_ERROR_MESSAGES[code]
  return '오류가 발생했어요. 다시 시도해주세요'
}

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

// A stock trade always writes alongside its linked income `expenses` doc.
// Both writes go through a single writeBatch so a mid-way failure can never
// leave an orphaned expense or a trade/expense pair out of sync.
export const addStockTradeWithExpense = async (
  uid: string,
  stockData: Omit<StockTrade, 'id' | 'uid' | 'linkedExpenseId'>,
  expenseData: Omit<Expense, 'id' | 'uid'>,
): Promise<{ id: string }> => {
  const batch = writeBatch(db)
  const expenseRef = doc(collection(db, 'expenses'))
  const stockRef = doc(collection(db, 'stock_trades'))
  batch.set(expenseRef, { ...expenseData, uid, createdAt: Date.now() })
  batch.set(stockRef, { ...stockData, uid, linkedExpenseId: expenseRef.id, createdAt: Date.now() })
  await batch.commit()
  return { id: stockRef.id }
}

export const updateStockTradeWithExpense = async (
  id: string,
  stockData: Partial<Omit<StockTrade, 'id' | 'uid'>>,
  linkedExpenseId: string | undefined,
  expenseData: Partial<Omit<Expense, 'id' | 'uid'>>,
) => {
  const batch = writeBatch(db)
  batch.update(doc(db, 'stock_trades', id), stockData)
  if (linkedExpenseId) batch.update(doc(db, 'expenses', linkedExpenseId), expenseData)
  await batch.commit()
}

export const deleteStockTradeWithExpense = async (id: string, linkedExpenseId?: string) => {
  const batch = writeBatch(db)
  batch.delete(doc(db, 'stock_trades', id))
  if (linkedExpenseId) batch.delete(doc(db, 'expenses', linkedExpenseId))
  await batch.commit()
}

// ── Asset Accounts (monthly) ───────────────────────────────────
export const subscribeAssetAccountsMonthly = (uid: string, yearMonth: string, cb: (items: AssetAccount[] | null) => void): Unsubscribe =>
  onSnapshot(doc(db, 'asset_accounts_monthly', `${uid}_${yearMonth}`), (s) =>
    cb(s.exists() ? (s.data().items as AssetAccount[]) : null))

export const setAssetAccountsMonthly = (uid: string, yearMonth: string, items: AssetAccount[]) =>
  setDoc(doc(db, 'asset_accounts_monthly', `${uid}_${yearMonth}`), { uid, yearMonth, items })

export const getAssetAccountsFallback = async (uid: string, yearMonth: string): Promise<AssetAccount[]> => {
  for (let i = 1; i <= 12; i++) {
    const d = new Date(yearMonth + '-01')
    d.setMonth(d.getMonth() - i)
    const ym = d.toISOString().slice(0, 7)
    const snap = await getDoc(doc(db, 'asset_accounts_monthly', `${uid}_${ym}`))
    if (snap.exists()) return snap.data().items as AssetAccount[]
  }
  const snap = await getDocs(query(collection(db, 'asset_accounts'), where('uid', '==', uid)))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as AssetAccount)).sort((a, b) => a.order - b.order)
}

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

// ── Stock Categories ───────────────────────────────────────────
export const subscribeStockCategories = (uid: string, cb: (cats: StockCategoryDef[] | null) => void): Unsubscribe =>
  onSnapshot(doc(db, 'stock_categories', uid), (s) => {
    if (!s.exists()) { cb(null); return }
    const data = s.data()
    cb(Array.isArray(data.categories) ? (data.categories as StockCategoryDef[]) : null)
  })

export const setStockCategories = (uid: string, categories: StockCategoryDef[]) =>
  setDoc(doc(db, 'stock_categories', uid), { categories })

// ── Data Export ──────────────────────────────────────────────
/**
 * spaceId 기준으로 전부 읽어온다 — 개인 모드면 본인 uid, 공유 모드면 household 초대 코드다.
 * 여기에 auth uid 를 넘기면 공유 모드에서 화면과 다른(사실상 빈) 데이터가 나온다.
 */
export const exportAllData = async (spaceId: string) => {
  const [
    expensesSnap,
    fixedMonthlySnap,
    savingsMonthlySnap,
    incomeSnap,
    assetAccountsSnap,
    assetAccountsMonthlySnap,
    assetSnapshotsSnap,
    paymentMethodsSnap,
    categoriesSnap,
    assetTypesSnap,
    stockTradesSnap,
    stockCategoriesSnap,
  ] = await Promise.all([
    getDocs(query(collection(db, 'expenses'), where('uid', '==', spaceId))),
    getDocs(query(collection(db, 'fixed_monthly'), where('uid', '==', spaceId))),
    getDocs(query(collection(db, 'savings_monthly'), where('uid', '==', spaceId))),
    getDocs(query(collection(db, 'monthly_income'), where('uid', '==', spaceId))),
    getDocs(query(collection(db, 'asset_accounts'), where('uid', '==', spaceId))),
    getDocs(query(collection(db, 'asset_accounts_monthly'), where('uid', '==', spaceId))),
    getDocs(query(collection(db, 'asset_snapshots'), where('uid', '==', spaceId))),
    getDoc(doc(db, 'payment_labels', spaceId)),
    getDoc(doc(db, 'expense_categories', spaceId)),
    getDoc(doc(db, 'asset_types', spaceId)),
    getDocs(query(collection(db, 'stock_trades'), where('uid', '==', spaceId))),
    getDoc(doc(db, 'stock_categories', spaceId)),
  ])

  return {
    exportedAt: new Date().toISOString(),
    uid: spaceId,
    expenses: expensesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Expense)),
    fixedMonthly: fixedMonthlySnap.docs.map(d => ({ id: d.id, ...d.data() } as { id: string; uid: string; yearMonth: string; items: FixedItem[] })),
    savingsMonthly: savingsMonthlySnap.docs.map(d => ({ id: d.id, ...d.data() } as { id: string; uid: string; yearMonth: string; items: SavingsItem[] })),
    monthlyIncome: incomeSnap.docs.map(d => ({ id: d.id, ...d.data() } as { id: string } & MonthlyIncome)),
    assetAccounts: assetAccountsSnap.docs.map(d => ({ id: d.id, ...d.data() } as AssetAccount)),
    assetAccountsMonthly: assetAccountsMonthlySnap.docs.map(d => ({ id: d.id, ...d.data() } as { id: string; uid: string; yearMonth: string; items: AssetAccount[] })),
    assetSnapshots: assetSnapshotsSnap.docs.map(d => ({ id: d.id, ...d.data() } as { id: string } & AssetSnapshot)),
    paymentMethods: paymentMethodsSnap.exists() ? (paymentMethodsSnap.data() as { methods: PaymentMethodDef[] }) : null,
    categories: categoriesSnap.exists() ? (categoriesSnap.data() as { categories: CategoryDef[] }) : null,
    assetTypes: assetTypesSnap.exists() ? (assetTypesSnap.data() as { types: AssetTypeDef[] }) : null,
    stockTrades: stockTradesSnap.docs.map(d => ({ id: d.id, ...d.data() } as StockTrade)),
    stockCategories: stockCategoriesSnap.exists() ? (stockCategoriesSnap.data() as { categories: StockCategoryDef[] }) : null,
  }
}

/** uid 필드로 본인 문서를 찾는 컬렉션들. 월별 문서도 안에 uid 를 갖고 있어 같은 방식으로 지운다. */
const OWNED_COLLECTIONS = [
  'expenses', 'stock_trades', 'asset_accounts', 'fixed_items', 'savings_items',
  'fixed_monthly', 'savings_monthly', 'monthly_income', 'asset_accounts_monthly', 'asset_snapshots',
]

/** 문서 id 가 곧 spaceId 인 컬렉션들. */
const KEYED_COLLECTIONS = ['payment_labels', 'expense_categories', 'asset_types', 'stock_categories']

/**
 * 회원 탈퇴. 개인 데이터를 지우고 Auth 계정을 없앤다.
 *
 * 공유 가계부 데이터는 건드리지 않는다 — 공유 모드의 문서는 uid 필드에 household 초대 코드가
 * 들어 있어서 같이 쓰는 사람 것이기도 하다. 여기서는 본인 uid 로 저장된 개인 데이터만 지우고,
 * household 에서는 멤버로서 빠지기만 한다.
 *
 * Auth 계정을 맨 마지막에 지운다 — 중간에 실패해도 로그인 상태가 남아 있어야 다시 시도할 수 있다.
 * 반대로 하면 로그인이 끊겨 남은 데이터를 지울 방법이 사라진다.
 */
export const deleteAccount = async (householdCode: string | null): Promise<void> => {
  const current = auth.currentUser
  if (!current) throw new Error('로그인이 필요합니다')
  const uid = current.uid

  for (const name of OWNED_COLLECTIONS) {
    const snap = await getDocs(query(collection(db, name), where('uid', '==', uid)))
    // writeBatch 는 한 번에 500건까지라 나눠 보낸다
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = writeBatch(db)
      for (const d of snap.docs.slice(i, i + 400)) batch.delete(d.ref)
      await batch.commit()
    }
  }

  for (const name of KEYED_COLLECTIONS) {
    await deleteDoc(doc(db, name, uid))
  }

  // 공유 가계부에서는 데이터를 지우지 않고 멤버에서만 빠진다
  if (householdCode) await updateDoc(doc(db, 'households', householdCode), { members: arrayRemove(uid) })

  await deleteDoc(doc(db, 'user_profiles', uid))
  await deleteUser(current)
}

// ── User Profiles ─────────────────────────────────────────────
export const subscribeUserProfile = (uid: string, cb: (profile: UserProfile | null) => void): Unsubscribe =>
  onSnapshot(doc(db, 'user_profiles', uid), (s) =>
    cb(s.exists() ? (s.data() as UserProfile) : null))

export const setUserProfile = (uid: string, data: Partial<UserProfile>) =>
  setDoc(doc(db, 'user_profiles', uid), data, { merge: true })

/** 표시 이름을 바꾼다. Auth 가 아니라 user_profiles 문서가 기준이다(UserProfile 주석 참고). */
export const updateUserName = (uid: string, displayName: string) =>
  setDoc(doc(db, 'user_profiles', uid), { displayName }, { merge: true })

/** 프로필 사진을 바꾼다. 빈 문자열이면 지운 것으로 보고 이름 첫 글자 아바타로 돌아간다. */
export const updateUserPhoto = (uid: string, photoURL: string) =>
  setDoc(doc(db, 'user_profiles', uid), { photoURL }, { merge: true })

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
