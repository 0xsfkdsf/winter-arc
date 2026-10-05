import { useEffect, useMemo, useState } from 'react';
import { Search, Play, Plus, Check, CornerDownLeft } from 'lucide-react';
import { useStore } from '../application/store';

export function CommandPalette({ open, close, onNewTask, onQuickFocus }: { open: boolean; close: () => void; onNewTask: () => void; onQuickFocus: () => void }) {
  const { go, tasks, subjects, notify } = useStore();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);

  useEffect(() => {
    if (open) { setQ(''); setSel(0); }
  }, [open ]);
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => s + 1); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, close]);

  const results = useMemo(() => {
    const base = [
      { id: 'focus', label: 'Start focus session', hint: 'timer', icon: Play, run: onQuickFocus },
      { id: 'task', label: 'New study task', hint: 'N', icon: Plus, run: onNewTask },
      { id: 'today', label: 'Open Today', hint: 'page', icon: CornerDownLeft, run: () => go('today') },
      { id: 'study', label: 'Open Study', hint: 'page', icon: CornerDownLeft, run: () => go('study') },
      { id: 'review', label: 'Open Weekly Review', hint: 'page', icon: CornerDownLeft, run: () => go('review') },
    ];
    const ql = q.toLowerCase();
    const found = ql
      ? [
          ...tasks.filter((t: any) => t.title.toLowerCase().includes(ql)).slice(0, 4).map((t: any) => ({
            id: 't' + t.id, label: t.title, hint: t.subjectName ?? 'task', icon: Check,
            run: () => { go('study'); notify(t.title); },
          })),
          ...subjects.filter((s: any) => s.name.toLowerCase().includes(ql)).slice(0, 3).map((s: any) => ({
            id: 's' + s.id, label: s.name, hint: 'subject', icon: Search, run: () => go('study'),
          })),
        ]
      : [];
    return [...found, ...base].slice(0, 9);
  }, [q, tasks, subjects, go, onNewTask, onQuickFocus, notify]);

  if (!open) return null;
  return (
    <div className="scrim" onClick={close} role="dialog" aria-label="Quick actions">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <input className="cmd-input" autoFocus placeholder="Type a command or search…" value={q} onChange={(e) => { setQ(e.target.value); setSel(0); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { results[sel % results.length]?.run(); close(); } }} />
        <div className="cmd-list">
          {results.map((r, i) => {
            const Icon = r.icon;
            return (
              <button key={r.id} className={'cmd-item' + (i === sel % results.length ? ' sel' : '')}
                onClick={() => { r.run(); close(); }} onMouseEnter={() => setSel(i)}>
                <Icon /> <span style={{ fontWeight: 600 }}>{r.label}</span>
                <span style={{ marginInlineStart: 'auto', color: 'var(--text-3)', fontSize: 12 }}>{r.hint}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
