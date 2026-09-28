import { useState, useCallback, useEffect } from 'react'
import { useAuth } from './hooks/useAuth'
import { useData } from './hooks/useData'
import { useHousehold } from './hooks/useHousehold'
import { signIn, signOutUser, exportAllData, signInWithEmail, signUpWithEmail, sendPasswordReset, deleteAccount } from './firebase'
import Header from './components/Header'
import TabBar, { type Tab } from './components/TabBar'
import Sidebar from './components/Sidebar'
import LoginOverlay from './components/LoginOverlay'
import HomeTab from './components/tabs/HomeTab'
import MoreTab from './components/tabs/MoreTab'
import ExpenseTab from './components/tabs/ExpenseTab'
import FixedTab from './components/tabs/FixedTab'
import AssetsTab from './components/tabs/AssetsTab'
import StockTab from './components/tabs/StockTab'
import ExpenseModal from './components/modals/ExpenseModal'
import IncomeEntryModal from './components/modals/IncomeEntryModal'
import StockTradeModal from './components/modals/StockTradeModal'
import FixedListModal from './components/modals/FixedListModal'
import SavingsListModal from './components/modals/SavingsListModal'
import AssetAccountModal from './components/modals/AssetAccountModal'
import AssetTypeModal from './components/modals/AssetTypeModal'
import PaymentLabelsModal from './components/modals/PaymentLabelsModal'
import CategoryModal from './components/modals/CategoryModal'
import StockCategoryModal from './components/modals/StockCategoryModal'
import CalendarTab from './components/tabs/CalendarTab'
import type { Expense, AssetAccount, StockTrade } from './types'

const TAB_TITLES: Record<Tab, string> = {
  home: '홈',
  calendar: '캘린더',
  fixed: '예산',
  expense: '지출',
  stocks: '주식',
  assets: '자산',
  more: '더보기',
}

type ModalState =
  | { type: 'expense'; item?: Expense; initialDate?: string }
  | { type: 'incomeEntry'; item?: Expense; initialDate?: string }
  | { type: 'stockTrade'; item?: StockTrade }
  | { type: 'fixed' }
  | { type: 'savings' }
  | { type: 'asset'; item?: AssetAccount }
  | { type: 'assetTypes' }
  | { type: 'paymentLabels' }
  | { type: 'categories' }
  | { type: 'stockCategories' }
  | null

function getYearMonth(offset = 0) {
  const d = new Date()
  d.setMonth(d.getMonth() + offset)
  return d.toISOString().slice(0, 7)
}

/**
 * 쓰기 실패를 알린다. 각 핸들러는 쓰기를 기다리지 않고 화면을 먼저 닫는다 —
 * Firestore 쓰기 Promise 는 "서버가 받았을 때" 풀리므로, 기다리면 오프라인에서
 * 모달이 영영 닫히지 않는다. 로컬 캐시에는 즉시 반영되고 온라인이 되면 자동 동기화된다.
 */
function withErrorAlert<A extends unknown[]>(action: string, fn: (...args: A) => Promise<void>) {
  return async (...args: A) => {
    try {
      await fn(...args)
    } catch (e) {
      alert(`${action} 중 오류가 발생했어요: ` + (e instanceof Error ? e.message : String(e)))
    }
  }
}

export default function App() {
  const { user, loading, refreshUser } = useAuth()
  const [tab, setTab] = useState<Tab>(() => {
    const saved = localStorage.getItem('moneylog-tab') as Tab | null
    const valid: Tab[] = ['home', 'calendar', 'expense', 'fixed', 'assets', 'stocks', 'more']
    return saved && valid.includes(saved) ? saved : 'home'
  })
  const [theme, setThemeState] = useState<'light' | 'dark'>(() =>
    (document.documentElement.getAttribute('data-theme') as 'light' | 'dark' | null) ?? 'light'
  )
  const [monthOffset, setMonthOffset] = useState(0)
  // 탈퇴하면 더보기 탭이 사라지고 로그인 화면으로 바뀌므로, 알림은 App 이 들고 있어야 살아남는다.
  const [toast, setToast] = useState('')
  const [modal, setModal] = useState<ModalState>(null)

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 4000)
    return () => clearTimeout(timer)
  }, [toast])

  const setTheme = useCallback((t: 'light' | 'dark') => {
    setThemeState(t)
    localStorage.setItem('moneylog-theme', t)
    document.documentElement.setAttribute('data-theme', t)
    document.querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', t === 'dark' ? '#000000' : '#F2F2F7')
  }, [])

  const yearMonth = getYearMonth(monthOffset)
  const household = useHousehold(user?.uid ?? '')
  const data = useData(household.spaceId, yearMonth)

  const changeTab = useCallback((t: Tab) => {
    setTab(t)
    localStorage.setItem('moneylog-tab', t)
    window.scrollTo(0, 0)
  }, [])
  const closeModal = useCallback(() => setModal(null), [])

  const incomeEntries = data.expenses.filter(e => e.type === 'income')
  const expenseEntries = data.expenses.filter(e => e.type !== 'income')
  const totalIncome = incomeEntries.reduce((s, e) => s + e.amount, 0)

  const openIncomeEntry = (item: Expense) => {
    const linkedTrade = data.stockTrades.find(t => t.linkedExpenseId === item.id)
    setModal(linkedTrade ? { type: 'stockTrade', item: linkedTrade } : { type: 'incomeEntry', item })
  }

  if (loading) return <div className="loading">불러오는 중…</div>

  // 이름·사진은 user_profiles 문서가 기준이고, 비어 있을 때만 Auth 값을 쓴다.
  // 사진을 지우면 profilePhoto 가 빈 문자열이 되는데, ?? 는 빈 문자열을 통과시키므로
  // "지웠다"가 Auth 사진으로 되돌아가지 않는다.
  const displayName = household.profileName || user?.displayName || ''
  const photoURL = household.profilePhoto ?? user?.photoURL ?? ''

  if (!user) return (
    <>
      <LoginOverlay
        onSignIn={signIn}
        onEmailSignIn={signInWithEmail}
        onEmailSignUp={async (name, email, password) => {
          const result = await signUpWithEmail(name, email, password)
          // 인증 메일 발송 실패는 LoginOverlay 가 알릴 틈이 없다 — 가입과 동시에 언마운트되기 때문
          setToast(result.verificationSent ? '가입이 완료되었어요. 인증 메일을 확인해주세요' : '가입했어요. 인증 메일은 보내지 못했어요')
          return result
        }}
        onPasswordReset={sendPasswordReset}
      />
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  )

  return (
    <div className="app">
      <Sidebar
        active={tab}
        onChange={changeTab}
        user={user}
        displayName={displayName}
        photoURL={photoURL}
        mode={household.mode}
        onAvatarClick={() => changeTab('more')}
      />
      <Header user={user} displayName={displayName} photoURL={photoURL} mode={household.mode} onAvatarClick={() => changeTab('more')} />
      <main className="app-main">
        <div className="main-container">
        <h1 className="sr-only">{TAB_TITLES[tab]}</h1>
        {tab !== 'more' && (
          <div className="month-nav">
            <button className="month-btn" onClick={() => setMonthOffset((o) => o - 1)} aria-label="이전 달">‹</button>
            <span className="month-label">{yearMonth.replace('-', '년 ').replace(/(\d+)$/, (m) => `${Number(m)}월`)}</span>
            <button className="month-btn" onClick={() => setMonthOffset((o) => o + 1)} disabled={!data.nextMonthHasData} aria-label="다음 달">›</button>
          </div>
        )}
        {tab === 'calendar' && (
          <CalendarTab
            expenses={data.expenses}
            yearMonth={yearMonth}
            methods={data.paymentMethods}
            onAddIncome={(date) => setModal({ type: 'incomeEntry', initialDate: date })}
            onAddExpense={(date) => setModal({ type: 'expense', initialDate: date })}
            onEditEntry={(item) => item.type === 'income' ? openIncomeEntry(item) : setModal({ type: 'expense', item })}
          />
        )}
        {tab === 'home' && (
          <HomeTab
            yearMonth={yearMonth}
            expenses={data.expenses}
            fixedItems={data.fixedItems}
            savingsItems={data.savingsItems}
            categories={data.categories}
            methods={data.paymentMethods}
            assetAccounts={data.assetAccounts}
            assetSnapshot={data.assetSnapshot}
            assetTypes={data.assetTypes}
            onAddExpense={() => setModal({ type: 'expense' })}
            onAddIncome={() => setModal({ type: 'incomeEntry' })}
            onEditIncomeEntry={openIncomeEntry}
          />
        )}
        {tab === 'expense' && (
          <ExpenseTab
            expenses={expenseEntries}
            yearMonth={yearMonth}
            methods={data.paymentMethods}
            categories={data.categories}
            totalIncome={totalIncome}
            totalFixed={data.fixedItems.reduce((s, i) => s + i.amount, 0)}
            totalSavings={data.savingsItems.reduce((s, i) => s + i.amount, 0)}
            onAdd={() => setModal({ type: 'expense' })}
            onEdit={(item) => setModal({ type: 'expense', item })}
            onEditMethods={() => setModal({ type: 'paymentLabels' })}
            onEditCategories={() => setModal({ type: 'categories' })}
          />
        )}
        {tab === 'stocks' && (
          <StockTab
            trades={data.stockTrades}
            categories={data.stockCategories}
            onAdd={() => setModal({ type: 'stockTrade' })}
            onEdit={(item) => setModal({ type: 'stockTrade', item })}
            onEditCategories={() => setModal({ type: 'stockCategories' })}
          />
        )}
        {tab === 'fixed' && (
          <FixedTab
            incomeEntries={incomeEntries}
            fixedItems={data.fixedItems}
            savingsItems={data.savingsItems}
            onAddIncome={() => setModal({ type: 'incomeEntry' })}
            onEditIncomeEntry={openIncomeEntry}
            onManageFixed={() => setModal({ type: 'fixed' })}
            onManageSavings={() => setModal({ type: 'savings' })}
          />
        )}
        {tab === 'assets' && (
          <AssetsTab
            accounts={data.assetAccounts}
            snapshot={data.assetSnapshot}
            assetTypes={data.assetTypes}
            onAddAccount={() => setModal({ type: 'asset' })}
            onEditAccount={(item) => setModal({ type: 'asset', item })}
            onDeleteAccount={data.deleteAssetAccount}
            onSaveSnapshot={data.setAssetSnapshot}
            onEditTypes={() => setModal({ type: 'assetTypes' })}
          />
        )}
        {tab === 'more' && (
          <MoreTab
            user={user}
            displayName={displayName}
            photoURL={photoURL}
            onChangeName={household.setName}
            onChangePhoto={household.setPhoto}
            onRefreshUser={refreshUser}
            onDeleteAccount={async (password) => {
              await deleteAccount(household.householdCode, password)
              setToast('탈퇴가 완료되었어요')
            }}
            mode={household.mode}
            householdCode={household.householdCode}
            theme={theme}
            onSetTheme={setTheme}
            onSwitchMode={household.switchMode}
            onCreate={household.create}
            onJoin={household.join}
            onLeave={household.leave}
            onSignOut={signOutUser}
            onExport={() => exportAllData(household.spaceId)}
          />
        )}
        </div>
      </main>
      <TabBar active={tab} onChange={changeTab} />

      {modal?.type === 'expense' && (
        <ExpenseModal
          expense={modal.item}
          yearMonth={yearMonth}
          initialDate={modal.initialDate}
          methods={data.paymentMethods}
          categories={data.categories}
          onSave={withErrorAlert('저장', async (items) => {
            const item = modal.item
            closeModal()
            if (item && items.length === 1) {
              await data.updateExpense(item.id, items[0])
            } else {
              await Promise.all(items.map(d => data.addExpense(d)))
            }
          })}
          onDelete={modal.item ? withErrorAlert('삭제', async () => { closeModal(); await data.deleteExpense(modal.item!.id) }) : undefined}
          onDeleteGroup={modal.item?.installmentGroupId ? withErrorAlert('삭제', async () => { closeModal(); await data.deleteExpenseGroup(modal.item!.installmentGroupId!) }) : undefined}
          onClose={closeModal}
        />
      )}
      {modal?.type === 'incomeEntry' && (
        <IncomeEntryModal
          expense={modal.item}
          yearMonth={yearMonth}
          initialDate={modal.initialDate}
          onSave={withErrorAlert('저장', async (d) => { const item = modal.item; closeModal(); await (item ? data.updateExpense(item.id, d) : data.addExpense(d)) })}
          onDelete={modal.item ? withErrorAlert('삭제', async () => { closeModal(); await data.deleteExpense(modal.item!.id) }) : undefined}
          onClose={closeModal}
        />
      )}
      {modal?.type === 'stockTrade' && (
        <StockTradeModal
          trade={modal.item}
          categories={data.stockCategories}
          onSave={withErrorAlert('저장', async (d) => {
            const item = modal.item
            closeModal()
            await (item
              ? data.updateStockTrade(item.id, item.linkedExpenseId, d)
              : data.addStockTrade(d))
          })}
          onDelete={modal.item ? withErrorAlert('삭제', async () => { closeModal(); await data.deleteStockTrade(modal.item!.id, modal.item!.linkedExpenseId) }) : undefined}
          onClose={closeModal}
        />
      )}
      {modal?.type === 'fixed' && (
        <FixedListModal
          items={data.fixedItems}
          onSave={withErrorAlert('저장', async (items) => { closeModal(); await data.bulkSaveFixedItems(items) })}
          onClose={closeModal}
        />
      )}
      {modal?.type === 'savings' && (
        <SavingsListModal
          items={data.savingsItems}
          onSave={withErrorAlert('저장', async (items) => { closeModal(); await data.bulkSaveSavingsItems(items) })}
          onClose={closeModal}
        />
      )}
      {modal?.type === 'asset' && (
        <AssetAccountModal
          account={modal.item}
          currentAmount={modal.item ? data.assetSnapshot?.amounts[modal.item.id] : undefined}
          assetTypes={data.assetTypes}
          onSave={withErrorAlert('저장', async (d, amount) => {
            const today = new Date().toISOString().slice(0, 10)
            const existing = data.assetSnapshot?.amounts ?? {}
            const item = modal.item
            closeModal()
            // 새 계좌는 id 를 기기에서 먼저 만들어 두므로, 금액 기록도 쓰기 완료를 기다릴 필요가 없다
            const { id, write } = item
              ? { id: item.id, write: data.updateAssetAccount(item.id, d) }
              : data.addAssetAccount(d)
            await Promise.all([
              write,
              amount === undefined ? null : data.setAssetSnapshot({ ...existing, [id]: amount }, today),
            ])
          })}
          onClose={closeModal}
        />
      )}
      {modal?.type === 'paymentLabels' && (
        <PaymentLabelsModal
          methods={data.paymentMethods}
          onSave={withErrorAlert('저장', async (m) => { closeModal(); await data.setPaymentMethods(m) })}
          onClose={closeModal}
        />
      )}
      {modal?.type === 'categories' && (
        <CategoryModal
          categories={data.categories}
          onSave={withErrorAlert('저장', async (cats) => { closeModal(); await data.setCategories(cats) })}
          onClose={closeModal}
        />
      )}
      {modal?.type === 'assetTypes' && (
        <AssetTypeModal
          assetTypes={data.assetTypes}
          onSave={withErrorAlert('저장', async (types) => { closeModal(); await data.setAssetTypes(types) })}
          onClose={closeModal}
        />
      )}
      {modal?.type === 'stockCategories' && (
        <StockCategoryModal
          categories={data.stockCategories}
          onSave={withErrorAlert('저장', async (cats) => { closeModal(); await data.setStockCategories(cats) })}
          onClose={closeModal}
        />
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}
