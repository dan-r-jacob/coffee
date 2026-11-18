import type { Brew, BrewDraft, Coffee, AppData, FieldDef, FieldType, FieldValue, InputValue, Recipe, RecipeField } from './types';
import { byId, clone, now, pad, toLocalInput, truncate, uid } from './util';

export const TYPES: { id: FieldType; label: string }[] = [
  { id: 'number', label: 'Number' },
  { id: 'text', label: 'Text' },
  { id: 'duration', label: 'Duration' },
  { id: 'boolean', label: 'Yes / No' },
  { id: 'longtext', label: 'Long text' }
];
export const noUnit = (t: FieldType) => t === 'duration' || t === 'boolean';

export interface Suggestion { label: string; type: FieldType; unit: string }
export const SUGGESTIONS: { group: string; items: Suggestion[] }[] = [
  { group: 'Coffee and grinding', items: [
    { label: 'Coffee dose', type: 'number', unit: 'g' },
    { label: 'Grind setting', type: 'number', unit: 'clicks' },
    { label: 'Grind size description', type: 'text', unit: '' } ] },
  { group: 'Water', items: [
    { label: 'Water quantity', type: 'number', unit: 'g' },
    { label: 'Water volume', type: 'number', unit: 'ml' },
    { label: 'Water temperature', type: 'number', unit: '°C' },
    { label: 'Brew ratio', type: 'text', unit: '' } ] },
  { group: 'Ice and iced coffee', items: [
    { label: 'Ice quantity', type: 'number', unit: 'g' },
    { label: 'Ice volume', type: 'number', unit: 'ml' },
    { label: 'Ice type', type: 'text', unit: '' },
    { label: 'Brewing water quantity', type: 'number', unit: 'g' },
    { label: 'Final beverage volume', type: 'number', unit: 'ml' } ] },
  { group: 'Brewing', items: [
    { label: 'Bloom water', type: 'number', unit: 'g' },
    { label: 'Bloom duration', type: 'duration', unit: '' },
    { label: 'Number of pours', type: 'number', unit: '' },
    { label: 'Pour quantity', type: 'number', unit: 'g' },
    { label: 'Pour interval', type: 'duration', unit: '' },
    { label: 'Steep duration', type: 'duration', unit: '' },
    { label: 'Total brew time', type: 'duration', unit: '' },
    { label: 'Extraction time', type: 'duration', unit: '' },
    { label: 'Pre-infusion time', type: 'duration', unit: '' },
    { label: 'Pressure', type: 'number', unit: 'bar' },
    { label: 'Beverage yield', type: 'number', unit: 'g' },
    { label: 'Plunge duration', type: 'duration', unit: '' } ] }
];

export const fmtDuration = (s: number) => {
  const n = Math.max(0, Math.round(Number(s)));
  return `${Math.floor(n / 60)}:${pad(n % 60)}`;
};
const unitJoin = (v: unknown, u: string) => (!u ? String(v) : u === '°C' || u === '°F' || u === '%' ? `${v}${u}` : `${v} ${u}`);

export function fmtVal(f: { type: FieldType; unit: string }, v: FieldValue | InputValue | undefined): string {
  if (v === null || v === undefined || v === '') return '—';
  switch (f.type) {
    case 'duration': return fmtDuration(Number(v));
    case 'boolean': return v ? 'Yes' : 'No';
    case 'number': return unitJoin(v, f.unit);
    default: return f.unit ? unitJoin(v, f.unit) : String(v);
  }
}
export function changeText(f: FieldDef, a: FieldValue | undefined, b: FieldValue | undefined) {
  if (f.type === 'number' && a != null && b != null) return `${a} → ${fmtVal(f, b)}`;
  if (f.type === 'text' || f.type === 'longtext') return `${truncate(fmtVal(f, a), 22)} → ${truncate(fmtVal(f, b), 22)}`;
  return `${fmtVal(f, a)} → ${fmtVal(f, b)}`;
}
export function same(t: FieldType, a: unknown, b: unknown) {
  const na = a === '' || a === undefined ? null : a;
  const nb = b === '' || b === undefined ? null : b;
  if (na === null || nb === null) return na === nb;
  if (t === 'number' || t === 'duration') return Number(na) === Number(nb);
  if (t === 'boolean') return !!na === !!nb;
  return String(na).trim() === String(nb).trim();
}
export function toInput(t: FieldType, v: FieldValue | undefined): InputValue {
  if (t === 'number') return v == null ? '' : String(v);
  if (t === 'duration') return v == null ? null : Number(v);
  if (t === 'boolean') return v == null ? null : !!v;
  return v == null ? '' : String(v);
}
export function fromInput(t: FieldType, x: InputValue | undefined): { v?: FieldValue; err?: string } {
  if (t === 'number') {
    const s = String(x == null ? '' : x).trim().replace(',', '.');
    if (s === '') return { v: null };
    const n = Number(s);
    return Number.isFinite(n) ? { v: n } : { err: 'Enter a number, like 18 or 18.5.' };
  }
  if (t === 'duration') return { v: x == null || x === '' ? null : Math.max(0, Math.round(Number(x))) };
  if (t === 'boolean') return { v: x == null ? null : !!x };
  const s = String(x == null ? '' : x);
  return { v: s.trim() === '' ? null : s.trim() };
}
export const sig = (fields: RecipeField[]) => JSON.stringify(fields.map(f => [f.id, f.label, f.type, f.unit, f.value]));

export interface BrewRow { f: FieldDef; std: FieldValue; act: FieldValue; extra: boolean; changed: boolean }
export function brewRows(brew: Brew): BrewRow[] {
  const rows: BrewRow[] = brew.snapshot.fields.map(f => ({ f, std: f.value, act: brew.values[f.id] ?? null, extra: false, changed: false }));
  (brew.extraFields || []).forEach(f => rows.push({ f, std: null, act: brew.values[f.id] ?? null, extra: true, changed: false }));
  rows.forEach(r => { r.changed = !r.extra && !same(r.f.type, r.std, r.act); });
  return rows;
}

export function newDraft(data: AppData, coffee: Coffee, recipe: Recipe, from?: Brew): BrewDraft {
  const brewer = byId(data.brewers, recipe.brewerId);
  const snapshot = { recipeName: recipe.name, brewerName: brewer ? brewer.name : '', coffeeName: coffee.name, fields: clone(recipe.fields) };
  const values: Record<string, InputValue> = {};
  recipe.fields.forEach(f => {
    const v = from && Object.prototype.hasOwnProperty.call(from.values, f.id) ? from.values[f.id] : f.value;
    values[f.id] = toInput(f.type, v);
  });
  const extraFields: FieldDef[] = [];
  if (from) {
    const fromDefs: FieldDef[] = [...from.snapshot.fields, ...(from.extraFields || [])];
    fromDefs.filter(sf => !recipe.fields.some(f => f.id === sf.id)).forEach(sf => {
      extraFields.push({ id: sf.id, label: sf.label, type: sf.type, unit: sf.unit || '' });
      values[sf.id] = toInput(sf.type, from.values[sf.id]);
    });
  }
  return { id: uid(), isNew: true, fromBrew: !!from, coffeeId: coffee.id, recipeId: recipe.id, brewedAt: toLocalInput(now()), snapshot, values, extraFields, feedback: '', nextTime: '' };
}
export function draftFromBrew(b: Brew): BrewDraft {
  const values: Record<string, InputValue> = {};
  [...b.snapshot.fields, ...(b.extraFields || [])].forEach(f => { values[f.id] = toInput(f.type, b.values[f.id]); });
  return { id: b.id, isNew: false, coffeeId: b.coffeeId, recipeId: b.recipeId, brewedAt: toLocalInput(b.brewedAt), snapshot: clone(b.snapshot), extraFields: clone(b.extraFields || []), values, feedback: b.feedback || '', nextTime: b.nextTime || '', createdAt: b.createdAt };
}

/** Sensible +/− step for a stepper, based on unit and size. */
export function stepFor(f: FieldDef, v: number) {
  if (f.type === 'duration') return 5;
  const u = (f.unit || '').toLowerCase();
  const n = Math.abs(Number(v) || 0);
  if (u === 'g') return n >= 100 ? 5 : n >= 30 ? 1 : 0.5;
  if (u === 'ml') return n >= 100 ? 10 : 5;
  if (u === 'bar') return 0.5;
  return 1;
}
/** "3:15" or "195" → seconds; NaN when unreadable; null when empty. */
export function parseDur(s: string): number | null {
  const t = String(s || '').trim();
  if (!t) return null;
  if (t.includes(':')) {
    const [m, sec] = t.split(':');
    const mm = Number(m || 0), ss = Number(sec || 0);
    return Number.isFinite(mm) && Number.isFinite(ss) ? Math.max(0, Math.round(mm * 60 + ss)) : NaN;
  }
  const n = Number(t);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : NaN;
}
