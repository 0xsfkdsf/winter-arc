import { useEffect, useMemo, useState } from 'react';
import { Plus, Play, Check, Trash2, X, Pencil } from 'lucide-react';
import { useStore } from '../application/store';
import { StudyRepo, SettingsRepo } from '../database/sqlite';
import { formatMinutes } from '../domain/dates';
import { perSubject } from '../domain/stats';
import { playCue } from '../audio/cues';

export function Study({ onFocusTask, newTaskSignal }: { onFocusTask: (t: any) => void; newTaskSignal: number }) {
  const s = useStore();
  const [activeSubj, setActiveSubj] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [delSubj, setDelSubj] = useState<any | null>(null);
  const subjId = activeSubj ?? s.subjects[0]?.id ?? null;

  const tasks = useMemo(() => (subjId ? StudyRepo.tasks(subjId) : []), [subjId, s.tasks]);
  const per = useMemo(() => perSubject(s.sessions as any, s.subjects), [s.sessions, s.subjects]);
  const todayMin = useMemo(() => {
    const k = s.todayKey;
    return (s.sessions as any[]).filter((x) => x.dateKey === k).reduce((a, x) => a + Math.max(0, (x.endedAt - x.startedAt - x.pausedMs) / 60000), 0);
  }, [s.sessions, s.todayKey]);

  useEffect(() => { if (newTaskSignal > 0) setShowNew(true); }, [newTaskSignal]);

  const confirmDeleteSubject = () => {
    if (!delSubj) return;
    StudyRepo.deleteSubject(delSubj.id);
    if (activeSubj === delSubj.id) setActiveSubj(null);
    s.notify(`Deleted ${delSubj.name} — past focus time stays in totals.`);
    setDelSubj(null);
  };

  return (
    <div className="page">
      <div className="hero-kicker">STUDY WORKSPACE</div>
      <h1 className="hero-day" style={{ fontSize: 38 }}>{s.subjects.find((x: any) => x.id === subjId)?.name ?? 'Study'}</h1>
      <div className="hero-stats">
        <div className="hstat"><div className="v num">{formatMinutes(todayMin)}</div><div className="l">TODAY'S FOCUS</div></div>
        <div className="hstat"><div className="v num">{s.sessions.filter((x: any) => x.dateKey === s.todayKey).length}</div><div className="l">SESSIONS</div></div>
        <div className="hstat"><div className="v num">{s.tasks.filter((t: any) => t.status !== 'done').length}</div><div className="l">OPEN TASKS</div></div>
      </div>

      <div className="study-grid">
        <div>
          <div className="side-section" style={{ paddingTop: 0 }}>SUBJECTS</div>
          {s.subjects.map((sub: any) => (
            <div key={sub.id} className="subj-row">
              <button className={'subj' + (sub.id === subjId ? ' active' : '')} onClick={() => setActiveSubj(sub.id)}>
                <span className="dot" style={{ background: sub.color }} /> {sub.name}
                <span style={{ marginInlineStart: 'auto', fontSize: 11, color: 'var(--text-3)' }} className="num">
                  {formatMinutes(per.find((p) => p.id === sub.id)?.minutes ?? 0)}
                </span>
              </button>
              <button className="icon-btn danger subj-del" onClick={() => setDelSubj(sub)} title={`Delete ${sub.name}`} aria-label={`Delete ${sub.name}`}>
                <Trash2 />
              </button>
            </div>
          ))}
          <AddSubject />
        </div>

        <div>
          <div className="toolbar" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
            <strong>Tasks</strong>
            <button className="btn primary" onClick={() => setShowNew(true)}><Plus /> New task <span className="kbd">N</span></button>
          </div>
          {tasks.length === 0 && <div style={{ color: 'var(--text-3)', padding: '20px 4px' }}>No plans yet. Create your first task for this subject.</div>}
          {tasks.map((t: any) => (
            <TaskItem key={t.id} t={t} onFocusTask={onFocusTask} onEdit={() => setEditing(t)} />
          ))}
        </div>

        <div className="study-side-right">
          <div className="side-section" style={{ paddingTop: 0 }}>PER SUBJECT · ARC</div>
          {per.map((p) => (
            <div key={p.id} style={{ marginBottom: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ fontWeight: 600 }}>{p.name}</span><span className="num" style={{ color: 'var(--text-2)' }}>{formatMinutes(p.minutes)}</span>
              </div>
              <div className="dim-bar"><i style={{ width: `${Math.min(100, (p.minutes / Math.max(1, Math.max(...per.map((x) => x.minutes), 1))) * 100)}%` }} /></div>
            </div>
          ))}
          <FocusSettings />
        </div>
      </div>

      {showNew && <NewTaskModal subjectId={subjId} close={() => setShowNew(false)} />}
      {editing && <NewTaskModal subjectId={subjId} initial={editing} close={() => setEditing(null)} />}
      {delSubj && (
        <div className="scrim" onClick={() => setDelSubj(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head"><strong>Delete {delSubj.name}?</strong></div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-2)', marginTop: 0 }}>
                Its {StudyRepo.tasks(delSubj.id).length} task(s) will also be removed.
                Past focus time stays in your arc totals.
              </p>
              <div className="toolbar" style={{ justifyContent: 'flex-end' }}>
                <button className="btn ghost" onClick={() => setDelSubj(null)}>Keep</button>
                <button className="btn danger" onClick={confirmDeleteSubject}><Trash2 size={14} /> Delete subject</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskItem({ t, onFocusTask, onEdit }: { t: any; onFocusTask: (t: any) => void; onEdit: () => void }) {
  const s = useStore();
  // Armed confirm has NO timeout: slower users (and agents) must never lose
  // it mid-thought. Moving the pointer off the card disarms instead.
  const [armed, setArmed] = useState(false);

  const remove = () => {
    if (!armed) { setArmed(true); return; }
    StudyRepo.deleteTask(t.id);
    s.notify('Task removed.');
  };

  return (
    <div className="task" onMouseLeave={() => setArmed(false)}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button className={'check' + (t.status === 'done' ? ' done' : '')} onClick={() => { playCue(t.status === 'done' ? 'toggle' : 'complete'); StudyRepo.toggleDone(t.id); }} aria-label="Toggle done"><Check /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 650, textDecoration: t.status === 'done' ? 'line-through' : 'none', opacity: t.status === 'done' ? .6 : 1 }}>{t.title}</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>~{t.estimateMin}m {t.deadline ? '· due ' + t.deadline : ''} · {t.priority}</div>
        </div>
        {t.status === 'done' && <span className="pill calm">Done</span>}
        {t.status !== 'done' && <button className="btn" onClick={() => onFocusTask(t)}><Play size={14} /> Focus</button>}
        <span className="task-actions">
          <button className="icon-btn" onClick={onEdit} title="Edit task" aria-label="Edit task"><Pencil /></button>
          {armed
            ? <button className="arm-confirm" onClick={remove} title="Click again to permanently delete">Sure?</button>
            : <button className="icon-btn danger" onClick={remove} title="Delete task" aria-label="Delete task"><Trash2 /></button>}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 }}>
        <input type="range" min={0} max={100} value={t.progress} onChange={(e) => StudyRepo.setProgress(t.id, Number(e.target.value))} style={{ flex: 1, accentColor: 'var(--frost)' }} aria-label="Progress" />
        <span className="num" style={{ fontSize: 12, color: 'var(--text-2)', width: 38 }}>{t.progress}%</span>
      </div>
      <div className="bar"><i style={{ width: `${t.progress}%` }} /></div>
    </div>
  );
}

function AddSubject() {
  const s = useStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  if (!open) return <button className="btn ghost" style={{ marginTop: 8 }} onClick={() => setOpen(true)}><Plus size={14} /> Subject</button>;
  return (
    <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
      <input className="input" placeholder="Subject name" value={name} onChange={(e) => setName(e.target.value)} />
      <button className="btn primary" onClick={() => {
        if (!name.trim() || !s.arc) return;
        const colors = ['#93b4fd', '#5eead4', '#f0c48a', '#c4b5fd', '#7dd3fc'];
        StudyRepo.addSubject(s.arc.id, name.trim(), colors[s.subjects.length % colors.length]);
        setName(''); setOpen(false);
      }}>Add</button>
    </div>
  );
}

function NewTaskModal({ subjectId, initial, close }: { subjectId: string | null; initial?: any; close: () => void }) {
  const s = useStore();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [est, setEst] = useState(initial?.estimateMin ?? 45);
  const [priority, setPriority] = useState(initial?.priority ?? 'normal');
  const [deadline, setDeadline] = useState(initial?.deadline ?? '');
  const [subj, setSubj] = useState(initial?.subjectId ?? subjectId ?? s.subjects[0]?.id);
  return (
    <div className="scrim" onClick={close}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><div className="toolbar" style={{ justifyContent: 'space-between' }}><strong>{initial ? 'Edit task' : 'New study task'}</strong><button className="icon-btn" onClick={close}><X /></button></div></div>
        <div className="modal-body">
          <div className="field"><label>Subject</label>
            <select className="select" value={subj} onChange={(e) => setSubj(e.target.value)}>
              {s.subjects.map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </div>
          <div className="field"><label>Task</label><input className="input" autoFocus placeholder="e.g. Lecture 4 — integration" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div className="field" style={{ flex: 1 }}><label>Estimate (min)</label><input className="input num" type="number" value={est} onChange={(e) => setEst(Number(e.target.value))} /></div>
            <div className="field" style={{ flex: 1 }}><label>Priority</label>
              <select className="select" value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option>
              </select>
            </div>
            <div className="field" style={{ flex: 1 }}><label>Deadline</label><input className="input" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></div>
          </div>
          <button className="btn primary" style={{ width: '100%', justifyContent: 'center' }} disabled={!title.trim()} onClick={() => {
            if (initial) {
              StudyRepo.updateTask(initial.id, { title: title.trim(), estimateMin: est || 45, deadline, priority, subjectId: subj });
              s.notify('Task updated.');
            } else {
              StudyRepo.addTask(subj, title.trim(), est || 45, deadline, priority);
              s.notify('Task created.');
            }
            close();
          }}>{initial ? 'Save changes' : 'Create task'}</button>
        </div>
      </div>
    </div>
  );
}

function FocusSettings() {
  const [p, setP] = useState(() => SettingsRepo.get('focus.planned', '45'));
  return (
    <div style={{ marginTop: 18 }}>
      <div className="side-section">FOCUS DEFAULT</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {[25, 45, 50, 60, 90, 120].map((m) => (
          <button key={m} className={'chip num' + (Number(p) === m ? ' on' : '')} onClick={() => { setP(String(m)); SettingsRepo.set('focus.planned', String(m)); }}>{m}</button>
        ))}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8, display: 'flex', gap: 6, alignItems: 'center' }}><Trash2 size={12} /> pure focus or pomodoro chosen at start</div>
    </div>
  );
}
