import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { brewRows, fmtDuration, fmtVal, parseDur } from '../lib/fields';
import type { Brew, FieldDef, InputValue, RecipeField } from '../lib/types';
import { pad } from '../lib/util';

const Svg = ({ children, vb }: { children: ReactNode; vb?: string }) => (
  <svg viewBox={vb || '0 0 32 32'} fill="none" stroke="currentColor" strokeWidth={vb ? 1.5 : 1.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {children}
  </svg>
);
export const Icon = {
  bean: () => <Svg vb="0 0 44 44"><ellipse cx="22" cy="22" rx="11" ry="16" transform="rotate(32 22 22)" /><path d="M15.4 10.6c4.2 3.4 3.3 8 6.2 11.4s6.9 4.8 7 11.2" /></Svg>,
  brewer: () => <Svg vb="0 0 44 44"><path d="M8 10h28l-9 14H17z" /><path d="M13 16h18M15.5 20h13" /><path d="M20 24v3M24 24v3" /><path d="M12 30h20v4.5a3.5 3.5 0 0 1-3.5 3.5h-13a3.5 3.5 0 0 1-3.5-3.5z" /></Svg>,
  recipe: () => <Svg vb="0 0 44 44"><rect x="10" y="6" width="24" height="32" rx="1.5" /><path d="M15.5 14h13M15.5 19.5h13M15.5 25h8" /><circle cx="28" cy="31" r="1" /></Svg>,
  log: () => <Svg vb="0 0 44 44"><path d="M9 7h18v30H9z" /><path d="M13.5 14h9M13.5 19h6" /><path d="M34 11l3.5 3.5-12 12-4.8 1.3 1.3-4.8z" /></Svg>,
  back: () => <Svg><path d="M19 7l-9 9 9 9" /></Svg>,
  home: () => <Svg><path d="M5 15L16 6l11 9" /><path d="M8.5 12.5V26h15V12.5" /></Svg>,
  chev: () => <Svg><path d="M12 7l9 9-9 9" /></Svg>,
  check: () => <Svg><path d="M7 16.5l6 6 12-13" /></Svg>,
  person: () => <Svg><circle cx="16" cy="11" r="5" /><path d="M6 27c1.5-5 5.5-7.5 10-7.5S24.5 22 26 27" /></Svg>
};
export const Chev = () => <span className="chev">{Icon.chev()}</span>;

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <h3 className="h3">{title}</h3>
      {children ? <p className="small muted empty-p">{children}</p> : null}
      {action ? <div className="empty-a">{action}</div> : null}
    </div>
  );
}
export function Params({ fields }: { fields: RecipeField[] }) {
  if (!fields.length) return <p className="small muted">No fields yet. Edit the recipe to add some.</p>;
  return (
    <dl className="params">
      {fields.map(f => (
        <Fragment key={f.id}>
          <dt>{f.label}</dt>
          <dd className={f.type === 'longtext' ? 'long' : ''}>{fmtVal(f, f.value)}</dd>
        </Fragment>
      ))}
    </dl>
  );
}
export const Gone = () => <Empty title="This item no longer exists">It may have been deleted. Use the back button to return.</Empty>;

export function LinkRow({ label, value, onClick, disabled, empty }: { label: string; value: string; onClick: () => void; disabled?: boolean; empty?: boolean }) {
  return (
    <button type="button" className="sel-row" onClick={onClick} disabled={!!disabled}>
      <span className="sel-main">
        <span className="label-sm">{label}</span>
        <span className={'sel-val' + (empty ? ' empty' : '')}>{value}</span>
      </span>
      <span className="sel-aside">{disabled ? null : <Chev />}</span>
    </button>
  );
}

export function DurationInput({ id, value, onChange }: { id?: string; value: InputValue; onChange: (v: number | null) => void }) {
  const num = value == null || value === '' ? null : Number(value);
  const m = num == null ? '' : String(Math.floor(num / 60));
  const s = num == null ? '' : pad(num % 60);
  const set = (mm: string, ss: string) => {
    mm = mm.replace(/\D/g, '');
    ss = ss.replace(/\D/g, '').slice(-2);
    if (mm === '' && ss === '') return onChange(null);
    onChange((Number(mm) || 0) * 60 + (Number(ss) || 0));
  };
  return (
    <div className="dur">
      <input id={id} className="input" inputMode="numeric" autoComplete="off" aria-label="Minutes" placeholder="0" value={m} onChange={e => set(e.target.value, s)} />
      <span>min</span>
      <input className="input" inputMode="numeric" autoComplete="off" aria-label="Seconds" placeholder="00" value={s} onChange={e => set(m, e.target.value)} />
      <span>sec</span>
    </div>
  );
}

export function ValueInput({ field, value, onChange, id, invalid, label }: { field: FieldDef; value: InputValue; onChange: (v: InputValue) => void; id?: string; invalid?: boolean; label?: string }) {
  const t = field.type;
  if (t === 'duration') return <DurationInput id={id} value={value} onChange={onChange} />;
  if (t === 'boolean')
    return (
      <div className="yn" role="group" aria-label={label || field.label || 'Yes or no'}>
        <button type="button" id={id} aria-pressed={value === true} onClick={() => onChange(true)}>Yes</button>
        <button type="button" aria-pressed={value === false} onClick={() => onChange(false)}>No</button>
      </div>
    );
  if (t === 'longtext')
    return <textarea id={id} className={'textarea' + (invalid ? ' invalid' : '')} rows={3} value={String(value ?? '')} onChange={e => onChange(e.target.value)} />;
  return (
    <div className="unit-wrap">
      <input id={id} className={'input' + (invalid ? ' invalid' : '')} type="text" inputMode={t === 'number' ? 'decimal' : 'text'} autoComplete="off" value={String(value ?? '')} onChange={e => onChange(e.target.value)} aria-invalid={invalid || undefined} />
      {field.unit ? <span className="unit" aria-hidden="true">{field.unit}</span> : null}
    </div>
  );
}

/** Minutes:seconds text box used inside steppers; commits on blur. */
export function DurText({ id, value, onChange, label }: { id: string; value: InputValue; onChange: (v: number | null) => void; label: string }) {
  const fmt = (v: InputValue) => (v == null || v === '' ? '' : fmtDuration(Number(v)));
  const [txt, setTxt] = useState(fmt(value));
  const [bad, setBad] = useState(false);
  useEffect(() => {
    if (parseDur(txt) !== (value == null ? null : Number(value))) { setTxt(fmt(value)); setBad(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const commit = () => {
    const p = parseDur(txt);
    if (p !== null && Number.isNaN(p)) { setBad(true); return; }
    setBad(false);
    onChange(p);
    setTxt(fmt(p));
  };
  return (
    <input id={id} className={bad ? 'invalid' : ''} inputMode="numeric" autoComplete="off" aria-label={label + ', minutes and seconds'} placeholder="0:00" value={txt}
      onChange={e => setTxt(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
  );
}

export function CmpTable({ brew }: { brew: Brew }) {
  const rows = brewRows(brew);
  return (
    <div className="table-scroll">
      <table className="cmp">
        <thead><tr><th scope="col">Parameter</th><th scope="col">Recipe</th><th scope="col">Actual</th></tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.f.id} className={r.changed ? 'is-changed' : ''}>
              <th scope="row">
                {r.f.label}
                {r.changed ? <span className="tag">Changed</span> : null}
                {r.extra ? <span className="tag tag-q">This brew</span> : null}
              </th>
              <td>{r.extra ? '—' : fmtVal(r.f, r.std)}</td>
              <td className="act">{fmtVal(r.f, r.act)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
