import { CmpTable, Empty, Gone } from '../components/ui';
import type { ScreenProps } from '../lib/ctx';
import { brewRows, sig } from '../lib/fields';
import type { Brew } from '../lib/types';
import { byId, fmtWhen, isActive, newestFirst, plural, whenShort } from '../lib/util';

export function History({ ctx, view }: ScreenProps) {
  const { data, nav } = ctx;
  const brews = data.brews.filter(b => (!view.coffeeId || b.coffeeId === view.coffeeId) && (!view.recipeId || b.recipeId === view.recipeId)).sort(newestFirst);
  const coffeeName = (b: Brew) => byId(data.coffees, b.coffeeId)?.name || b.snapshot.coffeeName;
  const recipeName = (b: Brew) => byId(data.recipes, b.recipeId)?.name || b.snapshot.recipeName;
  const c = byId(data.coffees, view.coffeeId);
  const r = byId(data.recipes, view.recipeId);
  const cName = c ? c.name : brews[0] ? brews[0].snapshot.coffeeName : '';
  const rName = r ? r.name : brews[0] ? brews[0].snapshot.recipeName : '';
  const both = !!(view.coffeeId && view.recipeId);
  return (
    <div>
      <header className="page-head">
        <h1 className="h1">History</h1>
        <p className="lede">{both ? `${cName} with ${rName}` : view.coffeeId ? cName : rName}</p>
      </header>
      {brews.length ? (
        <ul className="list">
          {brews.map(b => {
            const changed = brewRows(b).filter(x => x.changed || (x.extra && x.act != null)).length;
            return (
              <li key={b.id}>
                <button type="button" className="hrow" onClick={() => nav.push({ name: 'brewDetail', id: b.id })}>
                  <span className="hrow-top"><span className="hrow-when">{whenShort(b.brewedAt)}</span><span className="label-sm">{changed ? plural(changed, 'change') : 'As recipe'}</span></span>
                  {both ? null : <span className="hrow-ctx">{view.coffeeId ? recipeName(b) : coffeeName(b)}</span>}
                  <span className="hrow-text">{b.nextTime ? `Try next: ${b.nextTime}` : b.feedback || 'No notes'}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : <Empty title="No brews yet">Brews you log will appear here.</Empty>}
    </div>
  );
}

export function BrewDetail({ ctx, view }: ScreenProps) {
  const { data, nav } = ctx;
  const b = byId(data.brews, view.id);
  if (!b) return <Gone />;
  const recipe = byId(data.recipes, b.recipeId);
  const coffee = byId(data.coffees, b.coffeeId);
  const canReuse = recipe && isActive(recipe) && coffee && isActive(coffee);
  const drift = recipe && sig(recipe.fields) !== sig(b.snapshot.fields);
  return (
    <div>
      <header className="page-head">
        <div className="eyebrow">{fmtWhen(b.brewedAt)}</div>
        <h1 className="h1">{recipe ? recipe.name : b.snapshot.recipeName}</h1>
        <p className="lede">{coffee ? coffee.name : b.snapshot.coffeeName}</p>
      </header>
      {b.nextTime || b.feedback ? (
        <section className="lastbrew" style={{ marginTop: 0 }} aria-label="Notes">
          <dl style={{ marginTop: 0 }}>
            {b.nextTime ? <><dt>Try next</dt><dd className="next">{b.nextTime}</dd></> : null}
            {b.feedback ? <><dt>Tasted</dt><dd>{b.feedback}</dd></> : null}
          </dl>
        </section>
      ) : <p className="small muted">No notes for this brew.</p>}
      <section className="block" aria-labelledby="bd-p">
        <h2 id="bd-p" className="caps" style={{ margin: '0 0 8px' }}>Parameters</h2>
        <CmpTable brew={b} />
        {drift ? <p className="small muted drift">The recipe has changed since. This brew is compared with the recipe as it was on the day.</p> : null}
      </section>
      <div className="actions">
        {canReuse && coffee && recipe ? <button type="button" className="btn btn-primary" onClick={() => ctx.startBrew(coffee, recipe, b)}>Reuse settings</button> : null}
        {recipe ? <button type="button" className="btn" onClick={() => ctx.promote(b)}>Make standard</button> : null}
      </div>
      <div className="actions-quiet">
        <button type="button" className="link" onClick={() => ctx.editBrew(b)}>Edit</button>
        <button type="button" className="link danger" onClick={() => ctx.deleteBrew(b, nav.popForce)}>Delete</button>
      </div>
    </div>
  );
}
