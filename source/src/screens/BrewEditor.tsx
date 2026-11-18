import { useEffect, useRef, useState } from 'react';
import { DurText, ValueInput } from '../components/ui';
import type { ScreenProps } from '../lib/ctx';
import { fmtVal, fromInput, same, stepFor, toInput } from '../lib/fields';
import type { Brew, BrewDraft, FieldDef, FieldValue, InputValue, RecipeField } from '../lib/types';
import { byId, focusFirstError, now, plural, uid } from '../lib/util';

export function BrewEditor({ ctx, view }: ScreenProps) {
  const { data, api, nav } = ctx;
  const [d, setD] = useState<BrewDraft>(view.draft!);
  const [step, setStep] = useState<1 | 2>(1);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const init = useRef(JSON.stringify(view.draft));

  useEffect(() => { ctx.dirtyRef.current = JSON.stringify(d) !== init.current; }, [d, ctx.dirtyRef]);
  useEffect(() => () => { ctx.dirtyRef.current = false; }, [ctx.dirtyRef]);
  useEffect(() => {
    ctx.backRef.current = step === 2 ? () => setStep(1) : null;
    ctx.setBarMid(<div className="steps" aria-hidden="true"><i className="on" /><i className={step === 2 ? 'on' : ''} /></div>);
    window.scrollTo(0, 0);
    return () => { ctx.backRef.current = null; ctx.setBarMid(null); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const coffee = byId(data.coffees, d.coffeeId);
  const coffeeName = coffee ? coffee.name : d.snapshot.coffeeName;
  const allFields: FieldDef[] = [...d.snapshot.fields, ...d.extraFields];
  const setVal = (id: string, v: InputValue) => {
    setD(x => ({ ...x, values: { ...x.values, [id]: v } }));
    if (errors[id]) setErrors(e => ({ ...e, [id]: undefined }));
  };
  const isChanged = (f: RecipeField) => { const p = fromInput(f.type, d.values[f.id]); return !p.err && !same(f.type, f.value, p.v); };
  const changedCount = d.snapshot.fields.filter(isChanged).length;
  const bump = (f: FieldDef & { value?: FieldValue }, dir: 1 | -1) => {
    const raw = d.values[f.id];
    let cur = Number(String(raw ?? '').replace(',', '.'));
    if (raw == null || String(raw).trim() === '' || !Number.isFinite(cur)) cur = Number(f.value) || 0;
    const nv = Math.max(0, Math.round((cur + dir * stepFor(f, cur)) * 10) / 10);
    setVal(f.id, f.type === 'duration' ? nv : String(nv));
  };
  const addExtra = () => ctx.openSheet({
    kind: 'fieldPicker', context: 'brew', existing: allFields.map(f => f.label),
    onAdd: defs => setD(x => {
      const added: FieldDef[] = defs.map(df => ({ id: uid(), label: df.label, type: df.type, unit: df.unit || '' }));
      const values = { ...x.values };
      added.forEach(f => { values[f.id] = toInput(f.type, null); });
      return { ...x, extraFields: [...x.extraFields, ...added], values };
    })
  });
  const removeExtra = (id: string) => setD(x => {
    const values = { ...x.values };
    delete values[id];
    return { ...x, extraFields: x.extraFields.filter(f => f.id !== id), values };
  });
  const checkParams = () => {
    const errs: Record<string, string> = {};
    const values: Record<string, FieldValue> = {};
    allFields.forEach(f => { const r = fromInput(f.type, d.values[f.id]); if (r.err) errs[f.id] = r.err; else values[f.id] = r.v ?? null; });
    return { errs, values };
  };
  const next = () => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    setTimeout(() => {
      const { errs } = checkParams();
      setErrors(errs);
      if (Object.keys(errs).length) { focusFirstError(); return; }
      setStep(2);
    }, 0);
  };
  const save = () => {
    const { errs, values } = checkParams();
    if (Object.keys(errs).length) { setErrors(errs); setStep(1); return; }
    if (!d.brewedAt || isNaN(new Date(d.brewedAt).getTime())) { setErrors({ brewedAt: 'Choose when you brewed this.' }); focusFirstError(); return; }
    const t = now();
    const brew: Brew = {
      id: d.id, coffeeId: d.coffeeId, recipeId: d.recipeId, brewedAt: new Date(d.brewedAt).toISOString(), values, extraFields: d.extraFields,
      snapshot: { ...d.snapshot, coffeeName }, feedback: d.feedback.trim(), nextTime: d.nextTime.trim(), createdAt: d.createdAt || t, updatedAt: t
    };
    api.saveBrew(brew);
    const recipe = byId(data.recipes, d.recipeId);
    if (recipe) api.patchSelection({ coffeeId: d.coffeeId, brewerId: recipe.brewerId, recipeId: recipe.id });
    ctx.toast(d.isNew ? 'Brew saved' : 'Brew updated');
    if (d.isNew) nav.setForce([{ name: 'home' }, { name: 'brew' }]);
    else nav.popForce();
  };

  const paramRow = (f: FieldDef & { value?: FieldValue }, extra: boolean) => {
    const id = 'v-' + f.id;
    const changed = !extra && isChanged(f as RecipeField);
    const stepper = f.type === 'number' || f.type === 'duration';
    const status = (
      <span className="pe-status">
        {extra ? <><span>This brew only</span><button type="button" className="link link-sm" onClick={() => removeExtra(f.id)}>Remove</button></>
          : changed ? <><span>Changed from {fmtVal(f, f.value)}</span><button type="button" className="link link-sm" onClick={() => setVal(f.id, toInput(f.type, f.value))}>Reset</button></>
          : <span>As recipe</span>}
      </span>
    );
    if (stepper)
      return (
        <div key={f.id} className={'pe' + (changed ? ' changed' : '')}>
          <div className="pe-row">
            <div className="pe-info"><label className="pe-label" htmlFor={id}>{f.label}</label>{status}</div>
            <div className="stepper">
              <button type="button" className="step-btn" aria-label={'Decrease ' + f.label} onClick={() => bump(f, -1)}>−</button>
              <div className="step-val">
                {f.type === 'duration'
                  ? <DurText id={id} value={d.values[f.id]} onChange={v => setVal(f.id, v)} label={f.label} />
                  : <input id={id} className={errors[f.id] ? 'invalid' : ''} type="text" inputMode="decimal" autoComplete="off" value={String(d.values[f.id] ?? '')} onChange={e => setVal(f.id, e.target.value)} aria-invalid={errors[f.id] ? true : undefined} />}
                <span className="step-unit">{f.type === 'duration' ? 'min:sec' : f.unit || ''}</span>
              </div>
              <button type="button" className="step-btn" aria-label={'Increase ' + f.label} onClick={() => bump(f, 1)}>+</button>
            </div>
          </div>
          {errors[f.id] ? <div className="err" role="alert">{errors[f.id]}</div> : null}
        </div>
      );
    return (
      <div key={f.id} className={'pe' + (changed ? ' changed' : '')}>
        <div className="pe-info"><label className="pe-label" htmlFor={id}>{f.label}</label>{status}</div>
        <div className="pe-full"><ValueInput field={f} id={id} value={d.values[f.id] ?? null} onChange={v => setVal(f.id, v)} invalid={!!errors[f.id]} label={f.label} /></div>
        {errors[f.id] ? <div className="err" role="alert">{errors[f.id]}</div> : null}
      </div>
    );
  };

  if (step === 1)
    return (
      <div>
        <header className="page-head">
          <div className="eyebrow">Step 1 of 2, {changedCount ? plural(changedCount, 'change') : 'nothing changed'}</div>
          <h1 className="h1">What you brewed</h1>
          <p className="lede">{d.fromBrew ? 'Filled in from the brew you’re reusing.' : 'Filled in from the recipe.'} Adjust only what you changed.</p>
        </header>
        <div className="pe-list">
          {d.snapshot.fields.map(f => paramRow(f, false))}
          {d.extraFields.map(f => paramRow(f, true))}
        </div>
        <button type="button" className="link add-field" onClick={addExtra}>+ Add a field for this brew</button>
        <div className="savebar"><div className="savebar-in">
          <button type="button" className="btn" onClick={() => nav.pop()}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={next}>Next: notes</button>
        </div></div>
      </div>
    );

  return (
    <div>
      <header className="page-head">
        <div className="eyebrow">Step 2 of 2</div>
        <h1 className="h1">How it went</h1>
        <p className="lede">{d.snapshot.recipeName}, {coffeeName}</p>
      </header>
      <div className="field">
        <label className="label" htmlFor="bw-next">Try next time<span className="opt">optional</span></label>
        <textarea id="bw-next" className="textarea" rows={3} placeholder="What will you change?" value={d.nextTime} onChange={e => setD(x => ({ ...x, nextTime: e.target.value }))} />
      </div>
      <div className="field">
        <label className="label" htmlFor="bw-fb">How it tasted<span className="opt">optional</span></label>
        <textarea id="bw-fb" className="textarea" rows={3} placeholder="Sweet, sour, thin, balanced…" value={d.feedback} onChange={e => setD(x => ({ ...x, feedback: e.target.value }))} />
      </div>
      <div className="field">
        <label className="label" htmlFor="bw-when">Brewed</label>
        <input id="bw-when" type="datetime-local" className={'input' + (errors.brewedAt ? ' invalid' : '')} value={d.brewedAt} onChange={e => setD(x => ({ ...x, brewedAt: e.target.value }))} />
        {errors.brewedAt ? <div className="err" role="alert">{errors.brewedAt}</div> : null}
      </div>
      <div className="savebar"><div className="savebar-in">
        <button type="button" className="btn" onClick={() => setStep(1)}>Back</button>
        <button type="button" className="btn btn-primary" onClick={save}>{d.isNew ? 'Save brew' : 'Save changes'}</button>
      </div></div>
    </div>
  );
}
