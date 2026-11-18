import { useMemo, useState } from 'react';
import { Sheet } from './Sheet';
import { Icon } from './ui';
import type { Ctx, ListItem } from '../lib/ctx';
import { SUGGESTIONS, TYPES, changeText, fmtVal, noUnit, same, type Suggestion } from '../lib/fields';
import type { Brew, Brewer, Coffee, FieldDef, FieldType } from '../lib/types';
import { byId, focusFirstError, fmtWhen, matches, now, plural, uid } from '../lib/util';

export function CoffeeSheet({ ctx, coffee, onSaved, onClose }: { ctx: Ctx; coffee?: Coffee; onSaved?: (c: Coffee) => void; onClose: () => void }) {
  const [f, setF] = useState({ name: coffee?.name || '', roaster: coffee?.roaster || '', origin: coffee?.origin || '', roastDate: coffee?.roastDate || '', notes: coffee?.notes || '' });
  const [err, setErr] = useState('');
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => { const v = e.target.value; setF(x => ({ ...x, [k]: v })); if (k === 'name') setErr(''); };
  const save = () => {
    if (!f.name.trim()) { setErr('Give the coffee a name.'); focusFirstError(); return; }
    const t = now();
    const c: Coffee = { ...(coffee || { id: uid(), createdAt: t, archivedAt: null }), name: f.name.trim(), roaster: f.roaster.trim(), origin: f.origin.trim(), roastDate: f.roastDate || '', notes: f.notes.trim(), updatedAt: t } as Coffee;
    ctx.api.saveCoffee(c);
    ctx.toast(coffee ? 'Coffee updated' : 'Coffee added');
    onClose();
    onSaved?.(c);
  };
  return (
    <Sheet title={coffee ? 'Edit coffee' : 'New coffee'} onClose={onClose} onEnter={save}
      footer={<><button type="button" className="btn" onClick={onClose}>Cancel</button><button type="button" className="btn btn-primary" onClick={save}>{coffee ? 'Save coffee' : 'Add coffee'}</button></>}>
      <div className="field">
        <label className="label" htmlFor="cf-name">Coffee name</label>
        <input id="cf-name" className={'input' + (err ? ' invalid' : '')} value={f.name} autoComplete="off" onChange={set('name')} />
        {err ? <div className="err" role="alert">{err}</div> : null}
      </div>
      <div className="grid2">
        <div className="field"><label className="label" htmlFor="cf-roaster">Roaster<span className="opt">optional</span></label><input id="cf-roaster" className="input" value={f.roaster} autoComplete="off" onChange={set('roaster')} /></div>
        <div className="field"><label className="label" htmlFor="cf-origin">Origin<span className="opt">optional</span></label><input id="cf-origin" className="input" value={f.origin} autoComplete="off" onChange={set('origin')} /></div>
      </div>
      <div className="field"><label className="label" htmlFor="cf-roast">Roast date<span className="opt">optional</span></label><input id="cf-roast" type="date" className="input" value={f.roastDate} onChange={set('roastDate')} /></div>
      <div className="field"><label className="label" htmlFor="cf-notes">Notes<span className="opt">optional</span></label><textarea id="cf-notes" className="textarea" rows={3} value={f.notes} onChange={set('notes')} /></div>
    </Sheet>
  );
}

export function BrewerSheet({ ctx, brewer, onSaved, onClose }: { ctx: Ctx; brewer?: Brewer; onSaved?: (b: Brewer) => void; onClose: () => void }) {
  const [f, setF] = useState({ name: brewer?.name || '', description: brewer?.description || '' });
  const [err, setErr] = useState('');
  const save = () => {
    if (!f.name.trim()) { setErr('Give the brewer a name.'); focusFirstError(); return; }
    const t = now();
    const b: Brewer = { ...(brewer || { id: uid(), createdAt: t, archivedAt: null }), name: f.name.trim(), description: f.description.trim(), updatedAt: t } as Brewer;
    ctx.api.saveBrewer(b);
    ctx.toast(brewer ? 'Brewer updated' : 'Brewer added');
    onClose();
    onSaved?.(b);
  };
  return (
    <Sheet title={brewer ? 'Edit brewer' : 'New brewer'} sub={brewer ? '' : 'Any brewing device or method. Add recipes to it afterwards.'} onClose={onClose} onEnter={save}
      footer={<><button type="button" className="btn" onClick={onClose}>Cancel</button><button type="button" className="btn btn-primary" onClick={save}>{brewer ? 'Save brewer' : 'Add brewer'}</button></>}>
      <div className="field">
        <label className="label" htmlFor="bf-name">Brewer name</label>
        <input id="bf-name" className={'input' + (err ? ' invalid' : '')} value={f.name} autoComplete="off" placeholder="e.g. Chemex, Moka pot" onChange={e => { setErr(''); setF(x => ({ ...x, name: e.target.value })); }} />
        {err ? <div className="err" role="alert">{err}</div> : null}
      </div>
      <div className="field"><label className="label" htmlFor="bf-desc">Description<span className="opt">optional</span></label><textarea id="bf-desc" className="textarea" rows={3} value={f.description} onChange={e => setF(x => ({ ...x, description: e.target.value }))} /></div>
    </Sheet>
  );
}

export function FieldPickerSheet({ existing, context, onAdd, onClose }: { existing: string[]; context: 'brew' | 'recipe'; onAdd: (defs: Suggestion[]) => void; onClose: () => void }) {
  const have = useMemo(() => new Set(existing.map(l => l.trim().toLowerCase())), [existing]);
  const [chosen, setChosen] = useState<string[]>([]);
  const [custom, setCustom] = useState<{ label: string; type: FieldType; unit: string }>({ label: '', type: 'number', unit: '' });
  const [err, setErr] = useState('');
  const toggle = (k: string) => setChosen(c => (c.includes(k) ? c.filter(x => x !== k) : [...c, k]));
  const addChosen = () => {
    onAdd(chosen.map(k => { const [g, i] = k.split(':').map(Number); return { ...SUGGESTIONS[g].items[i] }; }));
    onClose();
  };
  const addCustom = () => {
    const label = custom.label.trim();
    if (!label) { setErr('Name the field first.'); focusFirstError(); return; }
    onAdd([{ label, type: custom.type, unit: noUnit(custom.type) ? '' : custom.unit.trim() }]);
    onClose();
  };
  return (
    <Sheet wide focusFirst={false} title="Add fields" onClose={onClose}
      sub={context === 'brew' ? 'These are added to this brew only. The recipe stays as it is.' : 'Pick any common fields, or make your own. None are required.'}
      footer={<><button type="button" className="btn" onClick={onClose}>Cancel</button><button type="button" className="btn btn-primary" disabled={!chosen.length} onClick={addChosen}>{chosen.length ? `Add ${plural(chosen.length, 'field')}` : 'Add fields'}</button></>}>
      {SUGGESTIONS.map((g, gi) => (
        <div key={g.group} className="sugg-group">
          <span className="label">{g.group}</span>
          <div className="pills">
            {g.items.map((it, ii) => {
              const k = gi + ':' + ii;
              const added = have.has(it.label.toLowerCase());
              return (
                <button key={k} type="button" className="pill" aria-pressed={chosen.includes(k)} disabled={added} onClick={() => toggle(k)}>
                  {it.label}{it.unit ? <span className="pill-u">{it.unit}</span> : null}{added ? <span className="pill-u">added</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div className="custom">
        <span className="label">Custom field</span>
        <div className="custom-grid">
          <div className="cg-name"><label className="label-sm" htmlFor="cu-l">Name</label>
            <input id="cu-l" className={'input' + (err ? ' invalid' : '')} placeholder="e.g. Swirl after bloom" value={custom.label} autoComplete="off"
              onChange={e => { setErr(''); setCustom(c => ({ ...c, label: e.target.value })); }} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }} /></div>
          <div><label className="label-sm" htmlFor="cu-t">Type</label>
            <select id="cu-t" className="select" value={custom.type} onChange={e => setCustom(c => ({ ...c, type: e.target.value as FieldType }))}>{TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select></div>
          <div><label className="label-sm" htmlFor="cu-u">Unit</label>
            <input id="cu-u" className="input" placeholder={noUnit(custom.type) ? '' : 'g, ml, °C…'} disabled={noUnit(custom.type)} value={custom.unit} onChange={e => setCustom(c => ({ ...c, unit: e.target.value }))} /></div>
        </div>
        {err ? <div className="err" role="alert" style={{ margin: '-4px 0 12px' }}>{err}</div> : null}
        <button type="button" className="btn btn-sm" onClick={addCustom}>Add custom field</button>
      </div>
    </Sheet>
  );
}

export function PromoteSheet({ ctx, brew, onClose }: { ctx: Ctx; brew: Brew; onClose: () => void }) {
  const recipe = byId(ctx.data.recipes, brew.recipeId);
  const [inc, setInc] = useState<string[]>([]);
  if (!recipe) return <Sheet title="Recipe not found" onClose={onClose} footer={<button type="button" className="btn" onClick={onClose}>Close</button>}><p className="dialog-p">The recipe for this brew has been deleted.</p></Sheet>;
  const defs: Record<string, FieldDef> = {};
  [...brew.snapshot.fields, ...(brew.extraFields || [])].forEach(f => { defs[f.id] = f; });
  const updates = recipe.fields.filter(f => defs[f.id] && defs[f.id].type === f.type && Object.prototype.hasOwnProperty.call(brew.values, f.id) && !same(f.type, f.value, brew.values[f.id]));
  const extras = Object.values(defs).filter(sf => !recipe.fields.some(f => f.id === sf.id) && brew.values[sf.id] != null);
  const apply = () => {
    const fields = recipe.fields
      .map(f => (updates.includes(f) ? { ...f, value: brew.values[f.id] } : f))
      .concat(extras.filter(x => inc.includes(x.id)).map(x => ({ id: x.id, label: x.label, type: x.type, unit: x.unit || '', value: brew.values[x.id] })));
    ctx.api.saveRecipe({ ...recipe, fields, updatedAt: now() });
    ctx.toast('Recipe updated');
    onClose();
  };
  return (
    <Sheet title="Make this the standard?" onClose={onClose}
      footer={<><button type="button" className="btn" onClick={onClose}>Cancel</button><button type="button" className="btn btn-primary" disabled={!updates.length && !inc.length} onClick={apply}>Update recipe</button></>}>
      <p className="dialog-p">{updates.length ? `These values in ${recipe.name} will be replaced with the ones from ${fmtWhen(brew.brewedAt)}:` : `The values in ${recipe.name} already match this brew.`}</p>
      {updates.length ? <ul className="change-list">{updates.map(f => <li key={f.id}><span className="muted">{f.label}</span><span>{changeText(f, f.value, brew.values[f.id])}</span></li>)}</ul> : null}
      {extras.length ? (
        <div className="field">
          <span className="label">This brew has fields that aren’t in the recipe. Add them?</span>
          {extras.map(x => (
            <div key={x.id}><label className="check"><input type="checkbox" checked={inc.includes(x.id)} onChange={e => setInc(s => (e.target.checked ? [...s, x.id] : s.filter(y => y !== x.id)))} />{x.label}: {fmtVal(x, brew.values[x.id])}</label></div>
          ))}
        </div>
      ) : null}
      <p className="small muted">Past brews keep their own record and won’t change.</p>
    </Sheet>
  );
}

export function ListSheet({ title, items, selectedId, onPick, onAdd, addLabel, emptyText, onClose }: { title: string; items: ListItem[]; selectedId?: string; onPick: (id: string) => void; onAdd?: () => void; addLabel?: string; emptyText?: string; onClose: () => void }) {
  const [q, setQ] = useState('');
  const shown = items.filter(i => matches(q, i.title, i.sub));
  return (
    <Sheet title={title} onClose={onClose} focusFirst={false}
      footer={<><button type="button" className="btn" onClick={onClose}>Cancel</button>{onAdd ? <button type="button" className="btn" onClick={() => { onClose(); onAdd(); }}>+ {addLabel}</button> : null}</>}>
      {items.length > 6 ? <div className="toolbar"><input type="search" className="input" placeholder="Search" aria-label="Search" value={q} onChange={e => setQ(e.target.value)} /></div> : null}
      {shown.length ? (
        <ul className="opts">
          {shown.map(i => (
            <li key={i.id}>
              <button type="button" className="optn" aria-pressed={i.id === selectedId} onClick={() => { onClose(); onPick(i.id); }}>
                <span className="optn-main"><span className="optn-title">{i.title}</span>{i.sub ? <span className="optn-sub">{i.sub}</span> : null}</span>
                {i.id === selectedId ? Icon.check() : null}
              </button>
            </li>
          ))}
        </ul>
      ) : <p className="small muted">{items.length ? 'Nothing matches.' : emptyText}</p>}
    </Sheet>
  );
}

export function AccountSheet({ ctx, onClose }: { ctx: Ctx; onClose: () => void }) {
  const p = ctx.profile;
  return (
    <Sheet title="Your account" onClose={onClose} focusFirst={false}
      footer={<><button type="button" className="btn" onClick={onClose}>Close</button><button type="button" className="btn btn-primary" onClick={() => { onClose(); ctx.signOut(); }}>Sign out</button></>}>
      <dl className="params" style={{ marginTop: 0 }}>
        <dt>Username</dt><dd>{p?.username || '—'}</dd>
        <dt>Email</dt><dd style={{ overflowWrap: 'anywhere' }}>{p?.email || '—'}</dd>
      </dl>
      <p className="small muted" style={{ marginTop: 14 }}>Signing out keeps all your coffees, recipes and brews safe. Sign back in with your username and password to see them again.</p>
    </Sheet>
  );
}
