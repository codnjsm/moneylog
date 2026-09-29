import { TABS, type Tab } from '../tabs'
import TabIcon from './TabIcon'

interface Props { active: Tab; onChange: (tab: Tab) => void }

export default function TabBar({ active, onChange }: Props) {
  return (
    <nav className="tab-bar">
      {TABS.map((t) => (
        <button key={t.id} className={`tab-item${active === t.id ? ' active' : ''}`} onClick={() => onChange(t.id)} aria-current={active === t.id ? 'page' : undefined}>
          <span className="tab-icon" aria-hidden="true"><TabIcon tab={t.id} size={22} /></span>
          <span className="tab-label">{t.label}</span>
        </button>
      ))}
    </nav>
  )
}
