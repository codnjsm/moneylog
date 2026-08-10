import { useState, useCallback } from 'react'
import { useAuth } from './hooks/useAuth'
import { useData } from './hooks/useData'
import { useHousehold } from './hooks/useHousehold'
import { signIn, signOutUser, exportAllData } from './firebase'
import Header from './components/Header'
import TabBar, { type Tab } from './components/TabBar'
import Sidebar from './components/Sidebar'
import DashboardTab from './components/tabs/DashboardTab'
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
import AccountModal from './components/modals/AccountModal'
import CalendarTab from './components/tabs/CalendarTab'
import type { Expense, AssetAccount, StockTrade } from './types'

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
  | { type: 'account' }
  | null

function getYearMonth(offset = 0) {
  const d = new Date()
  d.setMonth(d.getMonth() + offset)
  return d.toISOString().slice(0, 7)
}

export default function App() {
  const { user, loading } = useAuth()
  const [tab, setTab] = useState<Tab>(() => {
    const saved = localStorage.getItem('moneylog-tab') as Tab | null
    const valid: Tab[] = ['dashboard', 'calendar', 'expense', 'fixed', 'assets', 'stocks']
    return saved && valid.includes(saved) ? saved : 'calendar'
  })
  const [monthOffset, setMonthOffset] = useState(0)
  const [modal, setModal] = useState<ModalState>(null)

  const yearMonth = getYearMonth(monthOffset)
  const household = useHousehold(user?.uid ?? '')
  const data = useData(household.spaceId, yearMonth)

  const changeTab = useCallback((t: Tab) => {
    setTab(t)
    localStorage.setItem('moneylog-tab', t)
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

  if (!user) {
    return (
      <div className="login-overlay">
        <div className="login-card">
          <div className="login-logo">💰</div>
          <h2>가계부</h2>
          <p>Google 계정으로 로그인하여 가계부를 시작하세요</p>
          <button className="google-btn" onClick={signIn}>
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width={18} alt="" />
            Google로 로그인
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <Sidebar
        active={tab}
        onChange={changeTab}
        user={user}
        mode={household.mode}
        onAvatarClick={() => setModal({ type: 'account' })}
      />
      <Header user={user} mode={household.mode} onAvatarClick={() => setModal({ type: 'account' })} />
      <main className="app-main">
        <div className="main-container">
        <div className="month-nav">
            <button className="month-btn" onClick={() => setMonthOffset((o) => o - 1)}>‹</button>
            <span className="month-label">{yearMonth.replace('-', '년 ').replace(/(\d+)$/, (m) => `${Number(m)}월`)}</span>
            <button className="month-btn" onClick={() => setMonthOffset((o) => o + 1)} disabled={!data.nextMonthHasData}>›</button>
          </div>
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
        {tab === 'dashboard' && (
          <DashboardTab
            incomeEntries={incomeEntries}
            fixedItems={data.fixedItems}
            savingsItems={data.savingsItems}
            expenses={expenseEntries}
            categories={data.categories}
            accounts={data.assetAccounts}
            snapshot={data.assetSnapshot}
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
          onSave={async (items) => {
            if (modal.item && items.length === 1) {
              await data.updateExpense(modal.item.id, items[0])
            } else {
              await Promise.all(items.map(d => data.addExpense(d)))
            }
            closeModal()
          }}
          onDelete={modal.item ? async () => { await data.deleteExpense(modal.item!.id); closeModal() } : undefined}
          onDeleteGroup={modal.item?.installmentGroupId ? async () => { await data.deleteExpenseGroup(modal.item!.installmentGroupId!); closeModal() } : undefined}
          onClose={closeModal}
        />
      )}
      {modal?.type === 'incomeEntry' && (
        <IncomeEntryModal
          expense={modal.item}
          yearMonth={yearMonth}
          initialDate={modal.initialDate}
          onSave={async (d) => { await (modal.item ? data.updateExpense(modal.item.id, d) : data.addExpense(d)); closeModal() }}
          onDelete={modal.item ? async () => { await data.deleteExpense(modal.item!.id); closeModal() } : undefined}
          onClose={closeModal}
        />
      )}
      {modal?.type === 'stockTrade' && (
        <StockTradeModal
          trade={modal.item}
          categories={data.stockCategories}
          onSave={async (d) => {
            await (modal.item
              ? data.updateStockTrade(modal.item.id, modal.item.linkedExpenseId, d)
              : data.addStockTrade(d))
            closeModal()
          }}
          onDelete={modal.item ? async () => { await data.deleteStockTrade(modal.item!.id, modal.item!.linkedExpenseId); closeModal() } : undefined}
          onClose={closeModal}
        />
      )}
      {modal?.type === 'fixed' && (
        <FixedListModal
          items={data.fixedItems}
          onSave={async (items) => { await data.bulkSaveFixedItems(items); closeModal() }}
          onClose={closeModal}
        />
      )}
      {modal?.type === 'savings' && (
        <SavingsListModal
          items={data.savingsItems}
          onSave={async (items) => { await data.bulkSaveSavingsItems(items); closeModal() }}
          onClose={closeModal}
        />
      )}
      {modal?.type === 'asset' && (
        <AssetAccountModal
          account={modal.item}
          currentAmount={modal.item ? data.assetSnapshot?.amounts[modal.item.id] : undefined}
          assetTypes={data.assetTypes}
          onSave={async (d, amount) => {
            try {
              const today = new Date().toISOString().slice(0, 10)
              const existing = data.assetSnapshot?.amounts ?? {}
              if (modal.item) {
                await data.updateAssetAccount(modal.item.id, d)
                if (amount !== undefined) await data.setAssetSnapshot({ ...existing, [modal.item.id]: amount }, today)
              } else {
                const created = await data.addAssetAccount(d)
                if (amount !== undefined) await data.setAssetSnapshot({ ...existing, [created.id]: amount }, today)
              }
              closeModal()
            } catch (e) {
              alert('저장 중 오류가 발생했어요: ' + (e instanceof Error ? e.message : String(e)))
            }
          }}
          onClose={closeModal}
        />
      )}
      {modal?.type === 'paymentLabels' && (
        <PaymentLabelsModal
          methods={data.paymentMethods}
          onSave={async (m) => { await data.setPaymentMethods(m); closeModal() }}
          onClose={closeModal}
        />
      )}
      {modal?.type === 'categories' && (
        <CategoryModal
          categories={data.categories}
          onSave={async (cats) => { await data.setCategories(cats); closeModal() }}
          onClose={closeModal}
        />
      )}
      {modal?.type === 'assetTypes' && (
        <AssetTypeModal
          assetTypes={data.assetTypes}
          onSave={async (types) => { await data.setAssetTypes(types); closeModal() }}
          onClose={closeModal}
        />
      )}
      {modal?.type === 'stockCategories' && (
        <StockCategoryModal
          categories={data.stockCategories}
          onSave={async (cats) => { await data.setStockCategories(cats); closeModal() }}
          onClose={closeModal}
        />
      )}
      {modal?.type === 'account' && (
        <AccountModal
          user={user}
          mode={household.mode}
          householdCode={household.householdCode}
          onSwitchMode={household.switchMode}
          onCreate={household.create}
          onJoin={household.join}
          onLeave={household.leave}
          onSignOut={signOutUser}
          onExport={() => exportAllData(user.uid)}
          onClose={closeModal}
        />
      )}
    </div>
  )
}
