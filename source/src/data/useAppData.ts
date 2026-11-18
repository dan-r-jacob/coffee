import { useCallback, useEffect, useRef, useState } from 'react';
import * as db from './db';
import type { AppData, Brew, Brewer, Coffee, LibraryKind, Profile, Recipe, Selection } from '../lib/types';
import { now, upsert } from '../lib/util';

const EMPTY_SEL: Selection = { coffeeId: '', brewerId: '', recipeId: '' };
const selKey = (userId: string) => `brew-notes:selection:${userId}`;

function readSelection(userId: string): Selection {
  try {
    const raw = localStorage.getItem(selKey(userId));
    if (raw) return { ...EMPTY_SEL, ...(JSON.parse(raw) as Partial<Selection>) };
  } catch { /* storage unavailable */ }
  return EMPTY_SEL;
}

export interface Api {
  saveCoffee(c: Coffee): void;
  saveBrewer(b: Brewer): void;
  saveRecipe(r: Recipe): void;
  saveBrew(b: Brew): void;
  deleteBrew(id: string): void;
  archive(kind: LibraryKind, id: string, on: boolean): void;
  remove(kind: LibraryKind, id: string): void;
  patchSelection(p: Partial<Selection>): void;
}

/**
 * Loads the signed-in user's data once, then applies every change to local
 * state immediately (so the app feels instant) and writes it to Supabase in
 * the background. If a write fails, the user is told and data is reloaded.
 */
export function useAppData(userId: string, email: string, onError: (msg: string) => void) {
  const [data, setData] = useState<AppData | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState('');
  const [selection, setSelection] = useState<Selection>(() => readSelection(userId));
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const reload = useCallback(async () => {
    setStatus(s => (s === 'ready' ? 'ready' : 'loading'));
    try {
      const [d, p] = await Promise.all([db.loadAll(), db.loadProfile(userId, email)]);
      setData(d);
      setProfile(p);
      setStatus('ready');
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }, [userId, email]);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => {
    try { localStorage.setItem(selKey(userId), JSON.stringify(selection)); } catch { /* ignore */ }
  }, [selection, userId]);

  const run = useCallback((what: string, op: () => Promise<void>) => {
    op().catch(e => {
      onErrorRef.current(`Couldn’t ${what}. ${e instanceof Error ? e.message : ''}`.trim());
      reload();
    });
  }, [reload]);

  const clearSel = (kind: LibraryKind, id: string) => setSelection(s => {
    if (kind === 'coffees' && s.coffeeId === id) return { ...s, coffeeId: '' };
    if (kind === 'brewers' && s.brewerId === id) return { ...s, brewerId: '', recipeId: '' };
    if (kind === 'recipes' && s.recipeId === id) return { ...s, recipeId: '' };
    return s;
  });

  const api: Api = {
    saveCoffee: c => { setData(d => d && { ...d, coffees: upsert(d.coffees, c) }); run('save the coffee', () => db.saveCoffee(c)); },
    saveBrewer: b => { setData(d => d && { ...d, brewers: upsert(d.brewers, b) }); run('save the brewer', () => db.saveBrewer(b)); },
    saveRecipe: r => { setData(d => d && { ...d, recipes: upsert(d.recipes, r) }); run('save the recipe', () => db.saveRecipe(r)); },
    saveBrew: b => { setData(d => d && { ...d, brews: upsert(d.brews, b) }); run('save the brew', () => db.saveBrew(b)); },
    deleteBrew: id => { setData(d => d && { ...d, brews: d.brews.filter(b => b.id !== id) }); run('delete the brew', () => db.deleteRow('brews', id)); },
    archive: (kind, id, on) => {
      const at = on ? now() : null;
      setData(d => d && { ...d, [kind]: (d[kind] as { id: string }[]).map(x => (x.id === id ? { ...x, archivedAt: at } : x)) });
      if (on) clearSel(kind, id);
      run(on ? 'archive it' : 'restore it', () => db.setArchived(kind, id, at));
    },
    remove: (kind, id) => {
      setData(d => d && { ...d, [kind]: (d[kind] as { id: string }[]).filter(x => x.id !== id) });
      clearSel(kind, id);
      run('delete it', () => db.deleteRow(kind, id));
    },
    patchSelection: p => setSelection(s => ({ ...s, ...p }))
  };

  return { data, profile, status, loadError, reload, api, selection };
}
