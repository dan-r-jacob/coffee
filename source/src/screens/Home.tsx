import { Icon } from '../components/ui';
import type { ScreenProps } from '../lib/ctx';
import type { LibraryKind } from '../lib/types';
import { byId, greeting, isActive } from '../lib/util';

export function Home({ ctx }: ScreenProps) {
  const { data, nav, selection: sel } = ctx;
  const c = byId(data.coffees, sel.coffeeId);
  const r = byId(data.recipes, sel.recipeId);
  const n = (k: LibraryKind) => (data[k] as { archivedAt: string | null }[]).filter(isActive).length;
  const item = (label: string, icon: JSX.Element, k: LibraryKind) => (
    <button type="button" className="home-icon" onClick={() => nav.push({ name: k })}>
      {icon}
      <span><span className="home-icon-label">{label}</span><span className="home-icon-sub">{n(k)} saved</span></span>
    </button>
  );
  return (
    <div className="home">
      <div className="home-top">
        <button type="button" className="account-btn" onClick={() => ctx.openSheet({ kind: 'account' })} aria-label="Your account and sign out">
          {Icon.person()}<span>{ctx.profile?.username || 'Account'}</span>
        </button>
      </div>
      <h1 className="display">{greeting()}</h1>
      <div className="home-spacer" />
      <nav aria-label="Main">
        <div className="home-icons">
          {item('Coffees', Icon.bean(), 'coffees')}
          {item('Brewers', Icon.brewer(), 'brewers')}
          {item('Recipes', Icon.recipe(), 'recipes')}
        </div>
        <button type="button" className="home-log" onClick={() => nav.push({ name: 'brew' })}>
          <span className="home-log-text">
            <span className="home-log-title">Log a brew</span>
            <span className="home-log-sub">{c && r ? `${c.name} with ${r.name}` : 'Choose a coffee, brewer and recipe'}</span>
          </span>
          {Icon.log()}
        </button>
      </nav>
    </div>
  );
}
