import type { MutableRefObject, ReactNode } from 'react';
import type { Api } from '../data/useAppData';
import type { Suggestion } from './fields';
import type { AppData, Brew, BrewDraft, Brewer, Coffee, LibraryKind, Profile, Recipe, RecipeDraft, Selection } from './types';

export type ViewName = 'home' | 'brew' | 'history' | 'brewDetail' | 'brewEdit' | 'coffees' | 'brewers' | 'recipes' | 'coffee' | 'brewer' | 'recipe' | 'recipeEdit';
export interface View {
  name: ViewName;
  id?: string;
  coffeeId?: string;
  recipeId?: string;
  brewerId?: string;
  select?: boolean;
  draft?: BrewDraft;
  copy?: RecipeDraft;
}
export interface Nav {
  push(v: View): void;
  pop(): void;
  reset(v: View): void;
  goBrew(): void;
  popForce(): void;
  setForce(s: View[]): void;
  replaceForce(v: View): void;
}
export interface ConfirmOptions {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}
export interface ListItem { id: string; title: string; sub?: string }
export type SheetSpec =
  | { kind: 'coffee'; item?: Coffee; onSaved?: (c: Coffee) => void }
  | { kind: 'brewer'; item?: Brewer; onSaved?: (b: Brewer) => void }
  | { kind: 'fieldPicker'; existing: string[]; context: 'brew' | 'recipe'; onAdd: (defs: Suggestion[]) => void }
  | { kind: 'promote'; brew: Brew }
  | { kind: 'list'; title: string; items: ListItem[]; selectedId?: string; onPick: (id: string) => void; onAdd?: () => void; addLabel?: string; emptyText?: string }
  | { kind: 'account' };

export interface Ctx {
  data: AppData;
  profile: Profile | null;
  selection: Selection;
  api: Api;
  nav: Nav;
  confirm(o: ConfirmOptions): Promise<boolean>;
  toast(msg: string): void;
  dirtyRef: MutableRefObject<boolean>;
  backRef: MutableRefObject<(() => void) | null>;
  setBarMid(n: ReactNode): void;
  openSheet(s: SheetSpec): void;
  startBrew(coffee: Coffee, recipe: Recipe, from?: Brew): void;
  editBrew(b: Brew): void;
  deleteBrew(b: Brew, after?: () => void): void;
  promote(b: Brew): void;
  archiveItem(kind: LibraryKind, item: { id: string; name: string; archivedAt: string | null }, on: boolean): void;
  removeItem(kind: LibraryKind, item: { id: string; name: string; archivedAt: string | null }): void;
  signOut(): void;
}
export interface ScreenProps { ctx: Ctx; view: View }
