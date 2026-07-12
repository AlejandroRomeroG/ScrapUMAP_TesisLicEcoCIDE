import {
  CircleDotDashed,
  Clock3,
  Grid3X3,
  Map,
  Users,
} from 'lucide-react'
import type { ViewId } from '../types'

interface NavigationProps {
  activeView: ViewId
  onChange: (view: ViewId) => void
}

const ITEMS: Array<{ id: ViewId; label: string; icon: typeof Map }> = [
  { id: 'map', label: 'Mapa', icon: Map },
  { id: 'time', label: 'Tiempo', icon: Clock3 },
  { id: 'programs', label: 'Programas', icon: Grid3X3 },
  { id: 'topics', label: 'Temas', icon: CircleDotDashed },
  { id: 'faculty', label: 'Profesorado', icon: Users },
]

export function Navigation({ activeView, onChange }: NavigationProps) {
  return (
    <aside className="side-navigation">
      <div className="brand-lockup">
        <span className="brand-mark">AT</span>
        <span className="brand-name">Atlas de<br />Tesis CIDE</span>
      </div>
      <nav aria-label="Vistas del atlas">
        {ITEMS.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" aria-current={activeView === id ? 'page' : undefined} onClick={() => onChange(id)}>
            <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="source-seal">
        <span aria-hidden="true" />
        <p>Datos verificados<br />OAI-PMH · Parquet</p>
      </div>
    </aside>
  )
}
