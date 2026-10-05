import { useState } from 'react';
import { ArrowRight, ArrowLeft, Snowflake } from 'lucide-react';
import { ArcRepo, SettingsRepo } from '../database/sqlite';
import { playCue } from '../audio/cues';
import { calendarKey, addDaysKey } from '../domain/dates';

const CHAPTERS = ['Season', 'Dates', 'Identity', 'Practices', 'Study & Focus', 'Begin'];

export function Onboarding({ done }: { done: () => void }) {
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState('Winter Arc');
  const [start, setStart] = useState(calendarKey());
  const [end, setEnd] = useState(addDaysKey(calendarKey(), 91));
  const [identity, setIdentity] = useState('A focused student who keeps promises to himself.');
  const [preset, setPreset] = useState(45);

  const next = () => setStep((v) => Math.min(v + 1, CHAPTERS.length - 1));
  const back = () => setStep((v) => Math.max(v - 1, 0));

  const finish = () => {
    const id = ArcRepo.create(title || 'Winter Arc', start, end, identity);
    SettingsRepo.set('focus.planned', String(preset));
    try { localStorage.setItem('wa.focus.preset', String(preset)); } catch { /* noop */ }
    void id;
    playCue('welcome');
    done();
  };

  return (
    <div className="onboard">
      <div className="onboard-card">
        <div className="chapter">CHAPTER {step + 1} · {CHAPTERS[step].toUpperCase()}</div>
        {step === 0 && (<>
          <div style={{ display: 'flex', justifyContent: 'center', margin: '14px 0' }}><Snowflake size={30} color="var(--frost)" /></div>
          <h1 className="big-q">Build your season.</h1>
          <p style={{ color: 'var(--text-2)' }}>A finite Winter Arc. Discipline without pressure.<br />Consistency &gt; perfection.</p>
          <div className="field" style={{ maxWidth: 340, margin: '20px auto' }}><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} style={{ textAlign: 'center', fontSize: 17, fontWeight: 700 }} /></div>
        </>)}
        {step === 1 && (<>
          <h1 className="big-q">Choose your dates.</h1>
          <p style={{ color: 'var(--text-2)' }}>90 days is the classic. Shorter is fine — finite beats vague.</p>
          <div style={{ display: 'flex', gap: 10, maxWidth: 420, margin: '20px auto' }}>
            <div className="field" style={{ flex: 1 }}><label>Start</label><input className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
            <div className="field" style={{ flex: 1 }}><label>End</label><input className="input" type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
          </div>
          <QuickRanges setStart={setStart} setEnd={setEnd} />
        </>)}
        {step === 2 && (<>
          <h1 className="big-q">Who are you becoming?</h1>
          <p style={{ color: 'var(--text-2)' }}>One sentence. Present tense. You will see this every morning.</p>
          <div className="field" style={{ maxWidth: 480, margin: '20px auto' }}>
            <textarea className="textarea" value={identity} onChange={(e) => setIdentity(e.target.value)} style={{ textAlign: 'center', fontSize: 16 }} rows={3} />
          </div>
        </>)}
        {step === 3 && (<>
          <h1 className="big-q">Your practices are ready.</h1>
          <p style={{ color: 'var(--text-2)' }}>Spiritual · Reading · Physical · Breaking habits.<br />Pre-configured calmly — you can adjust from Today.</p>
          <div className="wizard-opts">
            {["Qur'an", 'Adhkar', 'Witr', 'Reading 5m', 'Workout', 'No series · No music · Less scrolling · Purity'].map((t) => (
              <span key={t} className="chip on">{t}</span>
            ))}
          </div>
        </>)}
        {step === 4 && (<>
          <h1 className="big-q">Study & focus.</h1>
          <p style={{ color: 'var(--text-2)' }}>Five subjects are prepared. Pick your default focus length.</p>
          <div className="wizard-opts">
            {[25, 45, 50, 60, 90, 120].map((m) => (
              <button key={m} className={'chip num' + (preset === m ? ' on' : '')} onClick={() => setPreset(m)}>{m}m</button>
            ))}
          </div>
          <p style={{ color: 'var(--text-3)', fontSize: 13 }}>Arabic · English · Mathematics · Physics · Chemistry</p>
        </>)}
        {step === 5 && (<>
          <h1 className="big-q">Begin quietly.</h1>
          <p style={{ color: 'var(--text-2)' }}><strong>{title}</strong> · {start} → {end}<br />“{identity}”</p>
          <p style={{ color: 'var(--text-3)', fontSize: 13 }}>Day 1 is available. You don't need to be perfect — just continue.</p>
        </>)}

        <div className="steps-dots">{CHAPTERS.map((_, i) => <i key={i} className={i <= step ? 'on' : ''} />)}</div>
        <div className="toolbar" style={{ justifyContent: 'center' }}>
          {step > 0 && <button className="btn ghost" onClick={back}><ArrowLeft size={15} /> Back</button>}
          {step < CHAPTERS.length - 1
            ? <button className="btn primary" onClick={next}>Continue <ArrowRight size={15} /></button>
            : <button className="btn primary" onClick={finish}>Start Day 1 <ArrowRight size={15} /></button>}
        </div>
      </div>
    </div>
  );
}

function QuickRanges({ setStart, setEnd }: any) {
  const today = calendarKey();
  return (
    <div className="wizard-opts">
      {[30, 60, 90, 92].map((n) => (
        <button key={n} className="chip num" onClick={() => { setStart(today); setEnd(addDaysKey(today, n - 1)); }}>{n} days</button>
      ))}
    </div>
  );
}
