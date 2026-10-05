import { Home, Mountain, BookOpen, History, TrendingUp, CalendarCheck, Settings, PanelLeftClose, PanelLeftOpen, Play } from 'lucide-react';
import { useStore, Page } from '../application/store';

const NAV: { id: Page; label: string; icon: any; kbd?: string }[] = [
  { id: 'today', label: 'Today', icon: Home },
  { id: 'arc', label: 'Arc', icon: Mountain },
  { id: 'study', label: 'Study', icon: BookOpen },
  { id: 'timeline', label: 'Timeline', icon: History },
  { id: 'progress', label: 'Progress', icon: TrendingUp },
  { id: 'review', label: 'Review', icon: CalendarCheck },
];

export function Sidebar({ onFocus }: { onFocus: () => void }) {
  const { page, go, arc, collapsed, toggleCollapsed } = useStore();
  return (
    <aside className="sidebar" aria-label="Primary">
      <div className="brand">
        <div className="brand-mark" aria-hidden />
        <div className="brand-text">
          <div className="brand-name">WINTER ARC</div>
          <div className="brand-sub">quiet momentum</div>
        </div>
      </div>
      <div className="side-section">FOCUS</div>
      {NAV.slice(0, 3).map((n) => <NavBtn key={n.id} n={n} active={page === n.id} go={go} />)}
      <div className="side-section">PROOF</div>
      {NAV.slice(3).map((n) => <NavBtn key={n.id} n={n} active={page === n.id} go={go} />)}
      {arc && (
        <div className="arc-mini">
          <div className="d">{arc.title}</div>
          <div className="t" style={{ fontStyle: 'italic', fontFamily: 'Georgia,serif', fontWeight: 500 }}>{arc.identity?.slice(0, 42) || 'Becoming.'}</div>
        </div>
      )}
      <div className="side-foot">
        <button className="nav-item" onClick={onFocus} title="Start focus (F)">
          <Play /> <span className="nav-label">Quick focus</span>
        </button>
        <button className="nav-item" onClick={() => go('settings')} title="Settings">
          <Settings /> <span className="nav-label">Settings</span>
        </button>
        <button className="nav-item" onClick={toggleCollapsed} title={collapsed ? 'Expand' : 'Collapse'}>
          {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />} <span className="nav-label">Collapse</span>
        </button>
      </div>
    </aside>
  );
}

function NavBtn({ n, active, go }: { n: any; active: boolean; go: (p: Page) => void }) {
  const Icon = n.icon;
  return (
    <button className={'nav-item' + (active ? ' active' : '')} onClick={() => go(n.id)} aria-current={active ? 'page' : undefined}>
      <Icon /> <span className="nav-label">{n.label}</span>
    </button>
  );
}

export function Ring({ size = 92, stroke = 9, value }: { size?: number; stroke?: number; value: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(Math.max(value, 0), 1));
  return (
    <svg className="ring" width={size} height={size} role="img" aria-label={`${Math.round(value * 100)} percent`}>
      <defs>
        <linearGradient id="frostGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#93b4fd" />
          <stop offset="100%" stopColor="#5eead4" />
        </linearGradient>
      </defs>
      <circle className="bg" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} />
      <circle className="fg" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={off} />
    </svg>
  );
}

export function Empty({ title, sub, action }: { title: string; sub: string; action?: React.ReactNode }) {
  return (
    <div className="empty">
      <div className="t">{title}</div>
      <div>{sub}</div>
      <div style={{ marginTop: 14 }}>{action}</div>
    </div>
  );
}
