import type { Tab } from '../tabs'

/** 아이콘은 두 곳에서 크기만 다르게 쓴다(탭바 22, 사이드바 18). */
export default function TabIcon({ tab, size }: { tab: Tab; size: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 22 22',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  switch (tab) {
    case 'home':
      return (
        <svg {...common}>
          <path d="M3 10l8-7 8 7"/>
          <path d="M5 9v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9"/>
          <path d="M9 19v-6h4v6"/>
        </svg>
      )
    case 'calendar':
      return (
        <svg {...common}>
          <rect x="3" y="5" width="16" height="14" rx="2"/>
          <path d="M3 10h16"/>
          <path d="M7 3v4"/>
          <path d="M15 3v4"/>
        </svg>
      )
    case 'expense':
      return (
        <svg {...common}>
          <rect x="2" y="6" width="18" height="13" rx="2"/>
          <path d="M2 10h18"/>
          <path d="M6 14h4"/>
        </svg>
      )
    case 'fixed':
      return (
        <svg {...common}>
          <rect x="3" y="5" width="16" height="14" rx="2"/>
          <path d="M3 10h16"/>
          <path d="M7 3v4"/>
          <path d="M15 3v4"/>
          <path d="M7 14h2"/>
          <path d="M11 14h2"/>
          <path d="M7 17h2"/>
        </svg>
      )
    case 'assets':
      return (
        <svg {...common}>
          <path d="M3 19h16"/>
          <path d="M5 19v-5"/>
          <path d="M9 19v-9"/>
          <path d="M13 19v-7"/>
          <path d="M17 19v-12"/>
        </svg>
      )
    case 'stocks':
      return (
        <svg {...common}>
          <path d="M3 17l5-6 4 3 6-8"/>
          <path d="M14 6h4v4"/>
        </svg>
      )
    case 'more':
      return (
        <svg width={size} height={size} viewBox="0 0 22 22" fill="none">
          <circle cx="5" cy="11" r="1.6" fill="currentColor"/>
          <circle cx="11" cy="11" r="1.6" fill="currentColor"/>
          <circle cx="17" cy="11" r="1.6" fill="currentColor"/>
        </svg>
      )
  }
}
