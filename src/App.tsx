import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AuthFlow, ResetPassword } from './auth/AuthScreens';
import { useSession } from './auth/useSession';
import { ConfirmSheet } from './components/Sheet';
import { AccountSheet, BrewerSheet, CoffeeSheet, FieldPickerSheet, ListSheet, PromoteSheet } from './components/sheets';
import { Icon } from './components/ui';
import { useAppData } from './data/useAppData';
import type { ConfirmOptions, Ctx, ScreenProps, SheetSpec, View, ViewName } from './lib/ctx';
import { draftFromBrew, newDraft } from './lib/fields';
import { missingConfig, supabase } from './lib/supabase';
import type { LibraryKind } from './lib/types';
import { cap, fmtWhen, plural } from './lib/util';
import { BrewDetail, History } from './screens/History';
import { BrewEditor } from './screens/BrewEditor';
import { BrewSetup } from './screens/BrewSetup';
import { Home } from './screens/Home';
import { BrewerDetail, BrewerList, CoffeeDetail, CoffeeList, RecipeDetail, RecipeList } from './screens/Library';
import { RecipeEditor } from './screens/RecipeEditor';

const SCREENS: Record<ViewName, (p: ScreenProps) => JSX.Element> = {
  home: Home, brew: BrewSetup, history: History, brewDetail: BrewDetail, brewEdit: BrewEditor,
  coffees: CoffeeList, brewers: BrewerList, recipes: RecipeList,
  coffee: CoffeeDetail, brewer: BrewerDetail, recipe: RecipeDetail, recipeEdit: RecipeEditor
};
const NOUN: Record<LibraryKind, string> = { coffees: 'coffee', brewers: 'brewer', recipes: 'recipe' };

function Centered({ children }: { children: ReactNode }) {
  return <main className="wrap centered">{children}</main>;
}

export default function App() {
  const { session, ready, recovery, endRecovery } = useSession();
  if (missingConfig)
    return <Centered><h1 className="h1">Setup needed</h1><p className="lede">This build has no Supabase settings. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY, then rebuild. See the README.</p></Centered>;
  if (!ready) return <Centered><div className="auth-icon" aria-label="Loading">{Icon.brewer()}</div></Centered>;
  if (session && recovery) return <ResetPassword onDone={endRecovery} />;
  if (!session) return <AuthFlow />;
  return <MainApp key={session.user.id} userId={session.user.id} email={session.user.email || ''} />;
}

function MainApp({ userId, email }: { userId: string; email: string }) {
  const [toastMsg, setToastMsg] = useState<{ msg: string; k: number } | null>(null);
  const toast = (msg: string) => setToastMsg({ msg, k: Date.now() });
  const { data, profile, status, loadError, reload, api, selection } = useAppData(userId, email, toast);
  const [stack, setStack] = useState<View[]>([{ name: 'home' }]);
  const view = stack[stack.length - 1];
  const [sheet, setSheet] = useState<SheetSpec | null>(null);
  const [dialog, setDialog] = useState<{ d: ConfirmOptions; resolve: (v: boolean) => void } | null>(null);
  const [barMid, setBarMid] = useState<ReactNode>(null);
  const dirtyRef = useRef(false);
  const backRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 2800);
    return () => clearTimeout(t);
  }, [toastMsg]);
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (dirtyRef.current) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, []);

  const confirm = (d: ConfirmOptions) => new Promise<boolean>(res => setDialog({ d, resolve: v => { setDialog(null); res(v); } }));
  const guard = async () => {
    if (!dirtyRef.current) return true;
    const ok = await confirm({ title: 'Discard your changes?', body: 'You have unsaved changes on this screen.', confirmLabel: 'Discard', cancelLabel: 'Keep editing', danger: true });
    if (ok) dirtyRef.current = false;
    return ok;
  };
  const top = () => window.scrollTo(0, 0);
  const nav = {
    push: async (v: View) => { if (await guard()) { setStack(s => [...s, v]); top(); } },
    pop: async () => { if (await guard()) { setStack(s => (s.length > 1 ? s.slice(0, -1) : s)); top(); } },
    reset: async (v: View) => { if (await guard()) { setStack([v]); top(); } },
    goBrew: async () => { if (await guard()) { setStack([{ name: 'home' }, { name: 'brew' }]); top(); } },
    popForce: () => { dirtyRef.current = false; setStack(s => (s.length > 1 ? s.slice(0, -1) : s)); top(); },
    setForce: (s: View[]) => { dirtyRef.current = false; setStack(s); top(); },
    replaceForce: (v: View) => { dirtyRef.current = false; setStack(s => [...s.slice(0, -1), v]); top(); }
  };
  const goBack = () => { if (backRef.current) backRef.current(); else nav.pop(); };

  if (status === 'loading' || !data)
    return status === 'error'
      ? <Centered><h1 className="h1">Couldn’t load your data</h1><p className="lede">{loadError || 'Something went wrong.'}</p><div className="actions"><button type="button" className="btn btn-primary" onClick={reload}>Try again</button><button type="button" className="btn" onClick={() => supabase.auth.signOut()}>Sign out</button></div></Centered>
      : <Centered><div className="auth-icon">{Icon.brewer()}</div><p className="lede">Loading your coffees…</p></Centered>;

  const ctx: Ctx = {
    data, profile, selection, api, nav, confirm, toast, dirtyRef, backRef, setBarMid,
    openSheet: s => setSheet(s),
    startBrew: (coffee, recipe, from) => nav.push({ name: 'brewEdit', draft: newDraft(data, coffee, recipe, from) }),
    editBrew: b => nav.push({ name: 'brewEdit', draft: draftFromBrew(b) }),
    deleteBrew: async (b, after) => {
      if (await confirm({ title: 'Delete this brew?', body: `The brew from ${fmtWhen(b.brewedAt)} and its notes will be removed. This can’t be undone.`, confirmLabel: 'Delete brew', danger: true })) {
        api.deleteBrew(b.id);
        toast('Brew deleted');
        after?.();
      }
    },
    promote: b => setSheet({ kind: 'promote', brew: b }),
    archiveItem: (kind, item, on) => { api.archive(kind, item.id, on); toast(on ? `${cap(NOUN[kind])} archived` : `${cap(NOUN[kind])} restored`); },
    removeItem: async (kind, item) => {
      const noun = NOUN[kind];
      const linked = kind === 'coffees' ? data.brews.filter(b => b.coffeeId === item.id).length
        : kind === 'recipes' ? data.brews.filter(b => b.recipeId === item.id).length
        : data.recipes.filter(r => r.brewerId === item.id).length;
      if (linked) {
        const what = kind === 'brewers' ? plural(linked, 'recipe') : plural(linked, 'logged brew');
        const ok = await confirm({
          title: 'Archive instead?',
          body: `${item.name} has ${what}, so deleting it would break your history. Archiving hides it from selection lists while keeping that history readable.${item.archivedAt ? ' It’s already archived.' : ''}`,
          confirmLabel: item.archivedAt ? 'OK' : `Archive ${noun}`
        });
        if (ok && !item.archivedAt) ctx.archiveItem(kind, item, true);
        return;
      }
      if (await confirm({ title: `Delete ${item.name}?`, body: `This ${noun} will be removed. This can’t be undone.`, confirmLabel: `Delete ${noun}`, danger: true })) {
        api.remove(kind, item.id);
        toast(`${cap(noun)} deleted`);
        nav.popForce();
      }
    },
    signOut: async () => {
      if (!(await guard())) return;
      await supabase.auth.signOut();
    }
  };

  const Screen = SCREENS[view.name] || Home;
  const isHome = view.name === 'home';
  const close = () => setSheet(null);
  let sheetEl: ReactNode = null;
  if (sheet) {
    if (sheet.kind === 'coffee') sheetEl = <CoffeeSheet ctx={ctx} coffee={sheet.item} onSaved={sheet.onSaved} onClose={close} />;
    else if (sheet.kind === 'brewer') sheetEl = <BrewerSheet ctx={ctx} brewer={sheet.item} onSaved={sheet.onSaved} onClose={close} />;
    else if (sheet.kind === 'fieldPicker') sheetEl = <FieldPickerSheet existing={sheet.existing} context={sheet.context} onAdd={sheet.onAdd} onClose={close} />;
    else if (sheet.kind === 'promote') sheetEl = <PromoteSheet ctx={ctx} brew={sheet.brew} onClose={close} />;
    else if (sheet.kind === 'list') sheetEl = <ListSheet {...sheet} onClose={close} />;
    else if (sheet.kind === 'account') sheetEl = <AccountSheet ctx={ctx} onClose={close} />;
  }

  return (
    <div className="app">
      {isHome ? null : (
        <header className="appbar"><div className="wrap"><div className="appbar-in">
          <button type="button" className="bar-btn" onClick={goBack} aria-label="Back">{Icon.back()}</button>
          <div className="bar-mid">{barMid}</div>
          <button type="button" className="bar-btn" onClick={() => nav.reset({ name: 'home' })} aria-label="Home">{Icon.home()}</button>
        </div></div></header>
      )}
      <main id="main" className={'wrap' + (isHome ? ' is-home' : '')} tabIndex={-1}>
        <Screen key={`${stack.length}:${view.name}:${view.id || ''}`} ctx={ctx} view={view} />
      </main>
      {sheetEl}
      {dialog ? <ConfirmSheet d={dialog.d} resolve={dialog.resolve} /> : null}
      <div className="sr-only" aria-live="polite">{toastMsg ? toastMsg.msg : ''}</div>
      {toastMsg ? <div key={toastMsg.k} className="toast" aria-hidden="true">{toastMsg.msg}</div> : null}
    </div>
  );
}
