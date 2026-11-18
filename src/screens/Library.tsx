import { useState, type ReactNode } from 'react';
import { Chev, Empty, Gone, LinkRow, Params } from '../components/ui';
import type { ScreenProps } from '../lib/ctx';
import { toInput } from '../lib/fields';
import { byId, byName, dayDiff, fmtDay, isActive, matches, parseDay, plural, uid } from '../lib/util';

const ArchTag = ({ x }: { x: { archivedAt: string | null } }) => (x.archivedAt ? <span className="tag tag-q">Archived</span> : null);

function Row({ title, sub, onClick, item }: { title: string; sub: string; onClick: () => void; item: { archivedAt: string | null } }) {
  return (
    <li>
      <button type="button" className="row" onClick={onClick}>
        <span className="row-main"><span className="row-title">{title}<ArchTag x={item} /></span><span className="row-sub">{sub}</span></span>
        <Chev />
      </button>
    </li>
  );
}

function ListScreen({ title, q, setQ, onAdd, addLabel, searchLabel, archCount, arch, setArch, children }: {
  title: string; q: string; setQ: (s: string) => void; onAdd: () => void; addLabel: string; searchLabel: string; archCount: number; arch: boolean; setArch: (b: boolean) => void; children: ReactNode;
}) {
  return (
    <div>
      <header className="page-head"><h1 className="h1">{title}</h1></header>
      <div className="toolbar">
        <input type="search" className="input" placeholder={searchLabel} aria-label={searchLabel} value={q} onChange={e => setQ(e.target.value)} />
        <button type="button" className="btn btn-primary" onClick={onAdd}>{addLabel}</button>
      </div>
      {children}
      {archCount ? (
        <div className="list-foot">
          <label className="check"><input type="checkbox" checked={arch} onChange={e => setArch(e.target.checked)} />Show archived ({archCount})</label>
        </div>
      ) : null}
    </div>
  );
}

export function CoffeeList({ ctx }: ScreenProps) {
  const { data, nav } = ctx;
  const [q, setQ] = useState('');
  const [arch, setArch] = useState(false);
  const add = () => ctx.openSheet({ kind: 'coffee', onSaved: c => nav.push({ name: 'coffee', id: c.id }) });
  const list = data.coffees.filter(c => (arch || isActive(c)) && matches(q, c.name, c.roaster, c.origin)).sort(byName);
  return (
    <ListScreen title="Coffees" q={q} setQ={setQ} onAdd={add} addLabel="Add" searchLabel="Search coffees" archCount={data.coffees.filter(c => c.archivedAt).length} arch={arch} setArch={setArch}>
      {list.length ? <ul className="list">{list.map(c => <Row key={c.id} item={c} title={c.name} sub={[c.roaster, c.origin].filter(Boolean).join(', ') || 'No details yet'} onClick={() => nav.push({ name: 'coffee', id: c.id })} />)}</ul>
        : q.trim() ? <Empty title="Nothing matches">No coffees match “{q.trim()}”.</Empty>
        : <Empty title="No coffees yet" action={<button type="button" className="btn btn-primary" onClick={add}>Add coffee</button>}>Only the name is required.</Empty>}
    </ListScreen>
  );
}

export function BrewerList({ ctx }: ScreenProps) {
  const { data, nav } = ctx;
  const [q, setQ] = useState('');
  const [arch, setArch] = useState(false);
  const add = () => ctx.openSheet({ kind: 'brewer', onSaved: b => nav.push({ name: 'brewer', id: b.id }) });
  const list = data.brewers.filter(b => (arch || isActive(b)) && matches(q, b.name, b.description)).sort(byName);
  return (
    <ListScreen title="Brewers" q={q} setQ={setQ} onAdd={add} addLabel="Add" searchLabel="Search brewers" archCount={data.brewers.filter(b => b.archivedAt).length} arch={arch} setArch={setArch}>
      {list.length ? <ul className="list">{list.map(b => <Row key={b.id} item={b} title={b.name} sub={plural(data.recipes.filter(r => r.brewerId === b.id && isActive(r)).length, 'recipe')} onClick={() => nav.push({ name: 'brewer', id: b.id })} />)}</ul>
        : q.trim() ? <Empty title="Nothing matches">No brewers match “{q.trim()}”.</Empty>
        : <Empty title="No brewers yet" action={<button type="button" className="btn btn-primary" onClick={add}>Add brewer</button>}>Any brewing device or method: a V60, an AeroPress, an espresso machine.</Empty>}
    </ListScreen>
  );
}

export function RecipeList({ ctx }: ScreenProps) {
  const { data, nav } = ctx;
  const [q, setQ] = useState('');
  const [arch, setArch] = useState(false);
  const add = () => nav.push({ name: 'recipeEdit' });
  const groups = data.brewers.filter(b => arch || isActive(b)).sort(byName)
    .map(b => ({ b, rs: data.recipes.filter(r => r.brewerId === b.id && (arch || isActive(r)) && matches(q, r.name, b.name)).sort(byName) }))
    .filter(g => g.rs.length);
  return (
    <ListScreen title="Recipes" q={q} setQ={setQ} onAdd={add} addLabel="New" searchLabel="Search recipes or brewers" archCount={data.recipes.filter(r => r.archivedAt).length} arch={arch} setArch={setArch}>
      {groups.length ? (
        <div>
          {groups.map(g => (
            <div key={g.b.id} className="group">
              <span className="caps">{g.b.name}</span>
              <ul className="list">{g.rs.map(r => <Row key={r.id} item={r} title={r.name} sub={plural(r.fields.length, 'field')} onClick={() => nav.push({ name: 'recipe', id: r.id })} />)}</ul>
            </div>
          ))}
        </div>
      ) : q.trim() ? <Empty title="Nothing matches">No recipes match “{q.trim()}”.</Empty>
        : <Empty title="No recipes yet" action={<button type="button" className="btn btn-primary" onClick={add}>Create recipe</button>}>{data.brewers.length ? 'Each recipe belongs to a brewer and tracks whichever fields you choose.' : 'Add a brewer first; every recipe belongs to one.'}</Empty>}
    </ListScreen>
  );
}

export function CoffeeDetail({ ctx, view }: ScreenProps) {
  const { data, api, nav } = ctx;
  const c = byId(data.coffees, view.id);
  if (!c) return <Gone />;
  const n = data.brews.filter(b => b.coffeeId === c.id).length;
  const rd = parseDay(c.roastDate);
  const age = rd ? dayDiff(rd) : null;
  return (
    <div>
      <header className="page-head">
        <div className="eyebrow">Coffee<ArchTag x={c} /></div>
        <h1 className="h1">{c.name}</h1>
        {c.roaster || c.origin ? <p className="lede">{[c.roaster, c.origin].filter(Boolean).join(', ')}</p> : null}
      </header>
      <dl className="params">
        <dt>Roast date</dt><dd>{c.roastDate ? fmtDay(c.roastDate) : '—'}</dd>
        {age != null && age >= 0 ? <><dt>Days off roast</dt><dd>{age}</dd></> : null}
      </dl>
      {c.notes ? <div className="note"><span className="label-sm">Notes</span><p>{c.notes}</p></div> : null}
      <div className="block sel-list">
        <LinkRow label="History" value={n ? plural(n, 'brew') : 'No brews yet'} empty={!n} disabled={!n} onClick={() => nav.push({ name: 'history', coffeeId: c.id })} />
      </div>
      <div className="actions">
        {isActive(c) ? <button type="button" className="btn btn-primary" onClick={() => { api.patchSelection({ coffeeId: c.id }); nav.goBrew(); }}>Brew this coffee</button> : null}
        <button type="button" className="btn" onClick={() => ctx.openSheet({ kind: 'coffee', item: c })}>Edit</button>
      </div>
      <div className="actions-quiet">
        <button type="button" className="link" onClick={() => ctx.archiveItem('coffees', c, !c.archivedAt)}>{c.archivedAt ? 'Restore' : 'Archive'}</button>
        <button type="button" className="link danger" onClick={() => ctx.removeItem('coffees', c)}>Delete</button>
      </div>
    </div>
  );
}

export function BrewerDetail({ ctx, view }: ScreenProps) {
  const { data, nav } = ctx;
  const b = byId(data.brewers, view.id);
  if (!b) return <Gone />;
  const recipes = data.recipes.filter(r => r.brewerId === b.id).sort((x, y) => Number(!!x.archivedAt) - Number(!!y.archivedAt) || byName(x, y));
  const newRecipe = () => nav.push({ name: 'recipeEdit', brewerId: b.id });
  return (
    <div>
      <header className="page-head">
        <div className="eyebrow">Brewer<ArchTag x={b} /></div>
        <h1 className="h1">{b.name}</h1>
        {b.description ? <p className="lede">{b.description}</p> : null}
      </header>
      <div className="sec-head"><h2 className="h3">Recipes</h2><button type="button" className="link link-sm" onClick={newRecipe}>+ New recipe</button></div>
      {recipes.length ? <ul className="list" style={{ marginTop: 10 }}>{recipes.map(r => <Row key={r.id} item={r} title={r.name} sub={plural(r.fields.length, 'field')} onClick={() => nav.push({ name: 'recipe', id: r.id })} />)}</ul>
        : <Empty title="No recipes yet" action={<button type="button" className="btn btn-primary" onClick={newRecipe}>Create recipe</button>}>Each {b.name} recipe can track completely different fields.</Empty>}
      <div className="actions"><button type="button" className="btn" onClick={() => ctx.openSheet({ kind: 'brewer', item: b })}>Edit brewer</button></div>
      <div className="actions-quiet">
        <button type="button" className="link" onClick={() => ctx.archiveItem('brewers', b, !b.archivedAt)}>{b.archivedAt ? 'Restore' : 'Archive'}</button>
        <button type="button" className="link danger" onClick={() => ctx.removeItem('brewers', b)}>Delete</button>
      </div>
    </div>
  );
}

export function RecipeDetail({ ctx, view }: ScreenProps) {
  const { data, api, nav } = ctx;
  const r = byId(data.recipes, view.id);
  if (!r) return <Gone />;
  const brewer = byId(data.brewers, r.brewerId);
  const n = data.brews.filter(x => x.recipeId === r.id).length;
  const duplicate = () => nav.push({
    name: 'recipeEdit',
    copy: { name: `${r.name} (copy)`, brewerId: r.brewerId, description: r.description, instructions: r.instructions, fields: r.fields.map(f => ({ ...f, id: uid(), value: toInput(f.type, f.value) })) }
  });
  return (
    <div>
      <header className="page-head">
        <div className="eyebrow">{brewer ? brewer.name : 'Recipe'}<ArchTag x={r} /></div>
        <h1 className="h1">{r.name}</h1>
        {r.description ? <p className="lede">{r.description}</p> : null}
      </header>
      <section aria-labelledby="rd-std">
        <h2 id="rd-std" className="caps" style={{ margin: 0 }}>Standard recipe</h2>
        <Params fields={r.fields} />
        {r.instructions ? <p className="method">{r.instructions}</p> : null}
      </section>
      <div className="block sel-list">
        <LinkRow label="History" value={n ? plural(n, 'brew') : 'No brews yet'} empty={!n} disabled={!n} onClick={() => nav.push({ name: 'history', recipeId: r.id })} />
      </div>
      <div className="actions">
        {isActive(r) && brewer && isActive(brewer) ? <button type="button" className="btn btn-primary" onClick={() => { api.patchSelection({ brewerId: r.brewerId, recipeId: r.id }); nav.goBrew(); }}>Brew with this</button> : null}
        <button type="button" className="btn" onClick={() => nav.push({ name: 'recipeEdit', id: r.id })}>Edit</button>
        <button type="button" className="btn" onClick={duplicate}>Duplicate</button>
      </div>
      <div className="actions-quiet">
        <button type="button" className="link" onClick={() => ctx.archiveItem('recipes', r, !r.archivedAt)}>{r.archivedAt ? 'Restore' : 'Archive'}</button>
        <button type="button" className="link danger" onClick={() => ctx.removeItem('recipes', r)}>Delete</button>
      </div>
    </div>
  );
}
