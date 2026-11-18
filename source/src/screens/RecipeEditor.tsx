import { useEffect, useRef, useState } from 'react';
import { Empty, ValueInput } from '../components/ui';
import type { ScreenProps } from '../lib/ctx';
import { TYPES, fromInput, noUnit, toInput } from '../lib/fields';
import type { EditableField, FieldType, InputValue, Recipe, RecipeDraft, RecipeField } from '../lib/types';
import { byId, byName, clone, focusFirstError, isActive, now, pad, plural, uid } from '../lib/util';

export function RecipeEditor({ ctx, view }: ScreenProps) {
  const { data, api, nav } = ctx;
  const existing = view.id ? byId(data.recipes, view.id) : undefined;
  const [r, setR] = useState<RecipeDraft>(() => {
    if (existing) return { name: existing.name, brewerId: existing.brewerId, description: existing.description, instructions: existing.instructions, fields: existing.fields.map(f => ({ ...f, value: toInput(f.type, f.value) })) };
    if (view.copy) return clone(view.copy);
    return { name: '', brewerId: view.brewerId || '', description: '', instructions: '', fields: [] };
  });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const init = useRef(JSON.stringify(r));
  useEffect(() => { ctx.dirtyRef.current = JSON.stringify(r) !== init.current; }, [r, ctx.dirtyRef]);
  useEffect(() => () => { ctx.dirtyRef.current = false; }, [ctx.dirtyRef]);
  if (view.id && !existing) return <Empty title="This recipe no longer exists">It may have been deleted.</Empty>;

  const brewCount = existing ? data.brews.filter(b => b.recipeId === existing.id).length : 0;
  const brewerOpts = data.brewers.filter(b => isActive(b) || b.id === r.brewerId).sort(byName);
  const set = (k: 'name' | 'brewerId' | 'description' | 'instructions', v: string) => { setR(x => ({ ...x, [k]: v })); if (errors[k]) setErrors(e => ({ ...e, [k]: undefined })); };
  const upd = (i: number, patch: Partial<EditableField>) => setR(x => ({ ...x, fields: x.fields.map((f, j) => (j === i ? { ...f, ...patch } : f)) }));
  const move = (i: number, dir: number) => setR(x => {
    const fs = [...x.fields];
    const j = i + dir;
    if (j < 0 || j >= fs.length) return x;
    [fs[i], fs[j]] = [fs[j], fs[i]];
    return { ...x, fields: fs };
  });
  const remove = (i: number) => setR(x => ({ ...x, fields: x.fields.filter((_, j) => j !== i) }));
  const changeType = (i: number, t: FieldType) => upd(i, { type: t, value: toInput(t, null), ...(noUnit(t) ? { unit: '' } : {}) });
  const addFields = () => ctx.openSheet({
    kind: 'fieldPicker', context: 'recipe', existing: r.fields.map(f => f.label),
    onAdd: defs => setR(x => ({ ...x, fields: [...x.fields, ...defs.map(df => ({ id: uid(), label: df.label, type: df.type, unit: df.unit || '', value: toInput(df.type, null) }))] }))
  });

  const save = () => {
    const e: Record<string, string> = {};
    const fields: RecipeField[] = [];
    if (!r.name.trim()) e.name = 'Give the recipe a name.';
    if (!r.brewerId || !byId(data.brewers, r.brewerId)) e.brewerId = 'Choose the brewer this recipe belongs to.';
    r.fields.forEach(f => {
      if (!f.label.trim()) e['l-' + f.id] = 'Name this field, or remove it.';
      const p = fromInput(f.type, f.value);
      if (p.err) e['v-' + f.id] = p.err;
      fields.push({ id: f.id, label: f.label.trim(), type: f.type, unit: noUnit(f.type) ? '' : (f.unit || '').trim(), value: p.err ? null : p.v ?? null });
    });
    setErrors(e);
    if (Object.keys(e).length) { focusFirstError(); return; }
    const t = now();
    const rec: Recipe = { ...(existing || { id: uid(), createdAt: t, archivedAt: null }), brewerId: r.brewerId, name: r.name.trim(), description: r.description.trim(), instructions: r.instructions.trim(), fields, updatedAt: t } as Recipe;
    api.saveRecipe(rec);
    if (view.select) api.patchSelection({ brewerId: rec.brewerId, recipeId: rec.id });
    ctx.toast(existing ? 'Recipe saved' : 'Recipe created');
    if (existing || view.select) nav.popForce();
    else nav.replaceForce({ name: 'recipe', id: rec.id });
  };

  const fieldRow = (f: EditableField, i: number) => (
    <li key={f.id} className="fb">
      <div className="fb-top">
        <span className="fb-n" aria-hidden="true">{pad(i + 1)}</span>
        <input className={'input fb-label' + (errors['l-' + f.id] ? ' invalid' : '')} aria-label={`Field ${i + 1} name`} placeholder="Field name" value={f.label} onChange={e => upd(i, { label: e.target.value })} />
        <div className="fb-ctl">
          <button type="button" className="icon-btn" aria-label={`Move ${f.label || 'field'} up`} disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
          <button type="button" className="icon-btn" aria-label={`Move ${f.label || 'field'} down`} disabled={i === r.fields.length - 1} onClick={() => move(i, 1)}>↓</button>
          <button type="button" className="icon-btn" aria-label={`Remove ${f.label || 'field'}`} onClick={() => remove(i)}>×</button>
        </div>
      </div>
      {errors['l-' + f.id] ? <div className="err" role="alert">{errors['l-' + f.id]}</div> : null}
      <div className="fb-grid">
        <div><label className="label-sm" htmlFor={'ft-' + f.id}>Type</label>
          <select id={'ft-' + f.id} className="select" value={f.type} onChange={e => changeType(i, e.target.value as FieldType)}>{TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select></div>
        <div><label className="label-sm" htmlFor={'fu-' + f.id}>Unit</label>
          <input id={'fu-' + f.id} className="input" value={f.unit} placeholder={noUnit(f.type) ? '' : 'g, ml, °C…'} disabled={noUnit(f.type)} onChange={e => upd(i, { unit: e.target.value })} /></div>
        <div className="fb-val"><label className="label-sm" htmlFor={'fv-' + f.id}>Standard value</label>
          <ValueInput field={f} id={'fv-' + f.id} value={f.value} onChange={(v: InputValue) => upd(i, { value: v })} invalid={!!errors['v-' + f.id]} label={f.label} /></div>
      </div>
      {errors['v-' + f.id] ? <div className="err" role="alert">{errors['v-' + f.id]}</div> : null}
    </li>
  );

  return (
    <div className="editor">
      <header className="page-head">
        <div className="eyebrow">{existing ? 'Edit recipe' : view.copy ? 'Duplicate recipe' : 'New recipe'}</div>
        <h1 className="h1">{r.name.trim() || 'Untitled recipe'}</h1>
        {brewCount ? <p className="lede">Changes apply to future brews. Your {plural(brewCount, 'past brew')} keep the recipe exactly as it was.</p> : null}
      </header>
      <div className="grid2">
        <div className="field">
          <label className="label" htmlFor="re-name">Recipe name</label>
          <input id="re-name" className={'input' + (errors.name ? ' invalid' : '')} value={r.name} autoComplete="off" placeholder="e.g. Everyday V60" onChange={e => set('name', e.target.value)} />
          {errors.name ? <div className="err" role="alert">{errors.name}</div> : null}
        </div>
        <div className="field">
          <div className="picker-head" style={{ marginBottom: 8 }}>
            <label className="label" htmlFor="re-brewer" style={{ margin: 0 }}>Brewer</label>
            <button type="button" className="link link-sm" onClick={() => ctx.openSheet({ kind: 'brewer', onSaved: b => set('brewerId', b.id) })}>+ New</button>
          </div>
          <select id="re-brewer" className={'select' + (errors.brewerId ? ' invalid' : '')} value={r.brewerId} onChange={e => set('brewerId', e.target.value)}>
            <option value="">Choose a brewer</option>
            {brewerOpts.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          {errors.brewerId ? <div className="err" role="alert">{errors.brewerId}</div> : null}
        </div>
      </div>
      <div className="field">
        <label className="label" htmlFor="re-desc">Description<span className="opt">optional</span></label>
        <textarea id="re-desc" className="textarea" rows={2} style={{ minHeight: 72 }} value={r.description} onChange={e => set('description', e.target.value)} />
      </div>
      <section className="block" aria-labelledby="re-fields">
        <div className="sec-head"><h2 id="re-fields" className="h3">Fields</h2><span className="label-sm">{plural(r.fields.length, 'field')}</span></div>
        <p className="small muted">Choose exactly what this recipe tracks and set a standard value for each. Standard values are filled in every time you brew.</p>
        {r.fields.length ? <ol className="fb-list">{r.fields.map(fieldRow)}</ol>
          : <div style={{ marginTop: 16 }}><Empty title="No fields yet">Add a dose, water, grind, ice, or anything else you want to track.</Empty></div>}
        <button type="button" className="btn add-field" onClick={addFields}>+ Add fields</button>
      </section>
      <section className="block">
        <label className="h3 label-h" htmlFor="re-ins">Method</label>
        <textarea id="re-ins" className="textarea" rows={5} placeholder="Brewing instructions, one step per line (optional)" value={r.instructions} onChange={e => set('instructions', e.target.value)} />
      </section>
      <div className="savebar"><div className="savebar-in">
        <button type="button" className="btn" onClick={() => nav.pop()}>Cancel</button>
        <button type="button" className="btn btn-primary" onClick={save}>Save recipe</button>
      </div></div>
    </div>
  );
}
