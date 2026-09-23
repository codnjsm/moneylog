import React from 'react'

export type Tab = 'home' | 'calendar' | 'expense' | 'fixed' | 'assets' | 'stocks' | 'more'

const ICONS: Record<Tab, React.ReactElement> = {
  home: (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10l8-7 8 7"/>
      <path d="M5 9v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9"/>
      <path d="M9 19v-6h4v6"/>
    </svg>
  ),
  calendar: (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="16" height="14" rx="2"/>
      <path d="M3 10h16"/>
      <path d="M7 3v4"/>
      <path d="M15 3v4"/>
    </svg>
  ),
  expense: (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="18" height="13" rx="2"/>
      <path d="M2 10h18"/>
      <path d="M6 14h4"/>
    </svg>
  ),
  fixed: (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="16" height="14" rx="2"/>
      <path d="M3 10h16"/>
      <path d="M7 3v4"/>
      <path d="M15 3v4"/>
      <path d="M7 14h2"/>
      <path d="M11 14h2"/>
      <path d="M7 17h2"/>
    </svg>
  ),
  assets: (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 19h16"/>
      <path d="M5 19v-5"/>
      <path d="M9 19v-9"/>
      <path d="M13 19v-7"/>
      <path d="M17 19v-12"/>
    </svg>
  ),
  stocks: (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17l5-6 4 3 6-8"/>
      <path d="M14 6h4v4"/>
    </svg>
  ),
  more: (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="5" cy="11" r="1.6" fill="currentColor"/>
      <circle cx="11" cy="11" r="1.6" fill="currentColor"/>
      <circle cx="17" cy="11" r="1.6" fill="currentColor"/>
    </svg>
  ),
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'home', label: '홈' },
  { id: 'calendar', label: '캘린더' },
  { id: 'fixed', label: '예산' },
  { id: 'expense', label: '지출' },
  { id: 'stocks', label: '주식' },
  { id: 'assets', label: '자산' },
]

interface Props { active: Tab; onChange: (tab: Tab) => void }

export default function TabBar({ active, onChange }: Props) {
  return (
    <nav className="tab-bar">
      {TABS.map((t) => (
        <button key={t.id} className={`tab-item${active === t.id ? ' active' : ''}`} onClick={() => onChange(t.id)} aria-current={active === t.id ? 'page' : undefined}>
          <span className="tab-icon" aria-hidden="true">{ICONS[t.id]}</span>
          <span className="tab-label">{t.label}</span>
        </button>
      ))}
    </nav>
  )
}
