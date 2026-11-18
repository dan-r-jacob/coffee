import { supabase } from '../lib/supabase';
import type { AppData, Brew, Brewer, Coffee, FieldDef, FieldValue, LibraryKind, Profile, Recipe, RecipeField, BrewSnapshot } from '../lib/types';

/* ---------- Row shapes (database) ---------- */
interface CoffeeRow { id: string; name: string; roaster: string | null; origin: string | null; roast_date: string | null; notes: string | null; created_at: string; updated_at: string; archived_at: string | null }
interface BrewerRow { id: string; name: string; description: string | null; created_at: string; updated_at: string; archived_at: string | null }
interface RecipeRow { id: string; brewer_id: string; name: string; description: string | null; instructions: string | null; fields: RecipeField[]; created_at: string; updated_at: string; archived_at: string | null }
interface BrewRow { id: string; coffee_id: string; recipe_id: string; brewed_at: string; actual_values: Record<string, FieldValue>; extra_fields: FieldDef[]; recipe_snapshot: BrewSnapshot; feedback: string | null; next_time_notes: string | null; created_at: string; updated_at: string }

const TABLE: Record<LibraryKind | 'brews', string> = { coffees: 'coffees', brewers: 'brewers', recipes: 'recipes', brews: 'brew_logs' };
const orNull = (s: string) => (s && s.trim() ? s : null);

/* ---------- Mappers ---------- */
const coffeeFromRow = (r: CoffeeRow): Coffee => ({ id: r.id, name: r.name, roaster: r.roaster || '', origin: r.origin || '', roastDate: r.roast_date || '', notes: r.notes || '', createdAt: r.created_at, updatedAt: r.updated_at, archivedAt: r.archived_at });
const coffeeToRow = (c: Coffee) => ({ id: c.id, name: c.name, roaster: orNull(c.roaster), origin: orNull(c.origin), roast_date: c.roastDate || null, notes: orNull(c.notes), created_at: c.createdAt, archived_at: c.archivedAt });
const brewerFromRow = (r: BrewerRow): Brewer => ({ id: r.id, name: r.name, description: r.description || '', createdAt: r.created_at, updatedAt: r.updated_at, archivedAt: r.archived_at });
const brewerToRow = (b: Brewer) => ({ id: b.id, name: b.name, description: orNull(b.description), created_at: b.createdAt, archived_at: b.archivedAt });
const recipeFromRow = (r: RecipeRow): Recipe => ({ id: r.id, brewerId: r.brewer_id, name: r.name, description: r.description || '', instructions: r.instructions || '', fields: Array.isArray(r.fields) ? r.fields : [], createdAt: r.created_at, updatedAt: r.updated_at, archivedAt: r.archived_at });
const recipeToRow = (r: Recipe) => ({ id: r.id, brewer_id: r.brewerId, name: r.name, description: orNull(r.description), instructions: orNull(r.instructions), fields: r.fields, created_at: r.createdAt, archived_at: r.archivedAt });
const brewFromRow = (r: BrewRow): Brew => ({ id: r.id, coffeeId: r.coffee_id, recipeId: r.recipe_id, brewedAt: r.brewed_at, values: r.actual_values || {}, extraFields: Array.isArray(r.extra_fields) ? r.extra_fields : [], snapshot: r.recipe_snapshot, feedback: r.feedback || '', nextTime: r.next_time_notes || '', createdAt: r.created_at, updatedAt: r.updated_at });
const brewToRow = (b: Brew) => ({ id: b.id, coffee_id: b.coffeeId, recipe_id: b.recipeId, brewed_at: b.brewedAt, actual_values: b.values, extra_fields: b.extraFields, recipe_snapshot: b.snapshot, feedback: orNull(b.feedback), next_time_notes: orNull(b.nextTime), created_at: b.createdAt });

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

/* ---------- Reads ---------- */
export async function loadAll(): Promise<AppData> {
  const [c, b, r, l] = await Promise.all([
    supabase.from('coffees').select('*'),
    supabase.from('brewers').select('*'),
    supabase.from('recipes').select('*'),
    supabase.from('brew_logs').select('*').order('brewed_at', { ascending: false })
  ]);
  return {
    coffees: check<CoffeeRow[]>(c).map(coffeeFromRow),
    brewers: check<BrewerRow[]>(b).map(brewerFromRow),
    recipes: check<RecipeRow[]>(r).map(recipeFromRow),
    brews: check<BrewRow[]>(l).map(brewFromRow)
  };
}
export async function loadProfile(userId: string, email: string): Promise<Profile> {
  const res = await supabase.from('profiles').select('username').eq('id', userId).maybeSingle();
  const row = check<{ username: string } | null>(res);
  return { username: row ? row.username : '', email };
}

/* ---------- Writes ---------- */
export const saveCoffee = async (c: Coffee) => { check(await supabase.from('coffees').upsert(coffeeToRow(c))); };
export const saveBrewer = async (b: Brewer) => { check(await supabase.from('brewers').upsert(brewerToRow(b))); };
export const saveRecipe = async (r: Recipe) => { check(await supabase.from('recipes').upsert(recipeToRow(r))); };
export const saveBrew = async (b: Brew) => { check(await supabase.from('brew_logs').upsert(brewToRow(b))); };
export const deleteRow = async (kind: LibraryKind | 'brews', id: string) => { check(await supabase.from(TABLE[kind]).delete().eq('id', id)); };
export const setArchived = async (kind: LibraryKind, id: string, at: string | null) => { check(await supabase.from(TABLE[kind]).update({ archived_at: at }).eq('id', id)); };

/* ---------- Username sign-in helpers ---------- */
export const USERNAME_RE = /^[a-z0-9_]{3,30}$/;
export const normaliseUsername = (s: string) => s.trim().toLowerCase();
export async function emailForUsername(username: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('email_for_username', { p_username: normaliseUsername(username) });
  if (error) throw new Error(error.message);
  return (data as string | null) || null;
}
export async function usernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('username_available', { p_username: normaliseUsername(username) });
  if (error) throw new Error(error.message);
  return !!data;
}
