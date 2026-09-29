/**
 * 탭 정의. 하단 탭바(모바일)와 사이드바(데스크톱)가 같은 목록을 써야 해서 여기 모아둔다.
 * 예전에는 두 컴포넌트가 각자 배열과 아이콘을 들고 있어, 한쪽만 고치면 순서가 어긋났다.
 */
export type Tab = 'home' | 'calendar' | 'expense' | 'fixed' | 'assets' | 'stocks' | 'more'

export const TABS: { id: Tab; label: string }[] = [
  { id: 'home', label: '홈' },
  { id: 'calendar', label: '캘린더' },
  { id: 'expense', label: '지출' },
  { id: 'fixed', label: '예산' },
  { id: 'assets', label: '자산' },
  { id: 'stocks', label: '주식' },
]
