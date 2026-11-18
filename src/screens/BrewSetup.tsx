import { useState } from 'react';
import { Empty, Icon, LinkRow, Params } from '../components/ui';
import type { ScreenProps } from '../lib/ctx';
import { byId, byName, isActive, newestFirst, plural, whenShort } from '../lib/util';

export function BrewSetup({ ctx }: ScreenProps) {
  const { data, api, nav, selection: sel } = ctx;
  const [editing, setEditing] = useState(false);
  const [showMethod, setShowMethod] = useState(false);
  const coffee = byId(data.coffees, sel.coffeeId);
  const brewer = byId(data.brewers, sel.brewerId);
  const r0 = byId(data.recipes, sel.recipeId);
  const recipe = r0 && brewer && r0.brewerId === brewer.id ? r0 : undefined;
  const coffees = data.coffees.filter(isActive).sort(byName);
  const brewers = data.brewers.filter(isActive).sort(byName);
  const recipes = brewer ? data.recipes.filter(r => r.brewerId === brewer.id && isActive(r)).sort(byName) : [];

  const newCoffee = () => ctx.openSheet({ kind: 'coffee', onSaved: c => api.patchSelection({ coffeeId: c.id }) });
  const newBrewer = () => ctx.openSheet({ kind: 'brewer', onSaved: b => api.patchSelection({ brewerId: b.id, recipeId: '' }) });
  const newRecipe = () => nav.push({ name: 'recipeEdit', brewerId: brewer ? brewer.id : '', select: true });
  const pickBrewer = (id: string) => {
    const rs = data.recipes.filter(r => r.brewerId === id && isActive(r));
    const keep = rs.some(r => r.id === sel.recipeId);
    api.patchSelection({ brewerId: id, recipeId: keep ? sel.recipeId : rs.length === 1 ? rs[0].id : '' });
  };
  const chooseCoffee = () => ctx.openSheet({ kind: 'list', title: 'Choose a coffee', selectedId: sel.coffeeId, addLabel: 'New coffee', onAdd: newCoffee, emptyText: 'No coffees yet.',
    items: coffees.map(c => ({ id: c.id, title: c.name, sub: [c.roaster, c.origin].filter(Boolean).join(', ') })), onPick: id => api.patchSelection({ coffeeId: id }) });
  const chooseBrewer = () => ctx.openSheet({ kind: 'list', title: 'Choose a brewer', selectedId: sel.brewerId, addLabel: 'New brewer', onAdd: newBrewer, emptyText: 'No brewers yet.',
    items: brewers.map(b => ({ id: b.id, title: b.name, sub: plural(data.recipes.filter(r => r.brewerId === b.id && isActive(r)).length, 'recipe') })), onPick: pickBrewer });
  const chooseRecipe = () => brewer && ctx.openSheet({ kind: 'list', title: 'Choose a recipe', selectedId: sel.recipeId, addLabel: 'New recipe', onAdd: newRecipe, emptyText: `No recipes for ${brewer.name} yet.`,
    items: recipes.map(r => ({ id: r.id, title: r.name, sub: r.description || plural(r.fields.length, 'field') })), onPick: id => api.patchSelection({ recipeId: id }) });

  const ready = !!(coffee && recipe && brewer);
  const history = ready ? data.brews.filter(b => b.coffeeId === coffee!.id && b.recipeId === recipe!.id).sort(newestFirst) : [];

  if (ready && !editing && coffee && recipe && brewer) {
    const last = history[0];
    return (
      <div>
        <div className="combo-line">
          <span className="caps">{coffee.name}, {brewer.name}</span>
          <button type="button" className="link link-sm" onClick={() => setEditing(true)}>Change</button>
        </div>
        <h1 className="poster" style={{ marginTop: 10 }}>{recipe.name}</h1>
        {last ? (
          <section className="lastbrew" aria-labelledby="lb-h">
            <div className="lastbrew-head"><h2 id="lb-h" className="h3">Your last brew</h2><span className="lastbrew-when">{whenShort(last.brewedAt)}</span></div>
            {last.nextTime || last.feedback ? (
              <dl>
                {last.nextTime ? <><dt>Try next</dt><dd className="next">{last.nextTime}</dd></> : null}
                {last.feedback ? <><dt>Tasted</dt><dd>{last.feedback}</dd></> : null}
              </dl>
            ) : <p className="small muted" style={{ margin: '10px 0 0' }}>No notes saved with that brew.</p>}
            <button type="button" className="lastbrew-link" onClick={() => nav.push({ name: 'history', coffeeId: coffee.id, recipeId: recipe.id })}>
              {history.length === 1 ? 'See this brew' : `All ${history.length} brews of this recipe`}{Icon.chev()}
            </button>
          </section>
        ) : <p className="first-note">This will be your first brew of {coffee.name} with this recipe.</p>}
        <section className="std" aria-labelledby="std-h">
          <div className="std-head">
            <h2 id="std-h" className="caps" style={{ margin: 0 }}>Standard recipe</h2>
            {recipe.instructions ? <button type="button" className="link link-sm" aria-expanded={showMethod} onClick={() => setShowMethod(v => !v)}>{showMethod ? 'Hide method' : 'Method'}</button> : null}
          </div>
          {showMethod ? <p className="method">{recipe.instructions}</p> : null}
          <Params fields={recipe.fields} />
          <div className="std-foot"><button type="button" className="link link-sm" onClick={() => nav.push({ name: 'recipeEdit', id: recipe.id })}>Edit recipe</button></div>
        </section>
        <div className="savebar"><div className="savebar-in">
          <button type="button" className="btn btn-primary" onClick={() => ctx.startBrew(coffee, recipe)}>Start brew</button>
        </div></div>
      </div>
    );
  }

  let prompt: JSX.Element | null = null;
  if (!coffee && !coffees.length) prompt = <Empty title="Start with a coffee" action={<button type="button" className="btn btn-primary" onClick={newCoffee}>Add coffee</button>}>Add the beans you’re brewing with. Only the name is required.</Empty>;
  else if (!brewer && !brewers.length) prompt = <Empty title="Add a brewer" action={<button type="button" className="btn btn-primary" onClick={newBrewer}>Add brewer</button>}>Any device or method: a V60, an espresso machine, a cold brew jar.</Empty>;
  else if (brewer && !recipes.length) prompt = <Empty title={`No recipes for ${brewer.name}`} action={<button type="button" className="btn btn-primary" onClick={newRecipe}>Create recipe</button>}>A recipe holds your standard parameters and tracks whichever fields you choose.</Empty>;

  return (
    <div>
      <header className="page-head">
        <h1 className="h1">Log a brew</h1>
        <p className="lede">Choose a coffee, brewer and recipe.</p>
      </header>
      <div className="sel-list">
        <LinkRow label="Coffee" value={coffee ? coffee.name : 'Choose a coffee'} empty={!coffee} onClick={chooseCoffee} />
        <LinkRow label="Brewer" value={brewer ? brewer.name : 'Choose a brewer'} empty={!brewer} onClick={chooseBrewer} />
        <LinkRow label="Recipe" value={recipe ? recipe.name : brewer ? 'Choose a recipe' : 'Choose a brewer first'} empty={!recipe} disabled={!brewer} onClick={() => { chooseRecipe(); }} />
      </div>
      {prompt ? <div className="block">{prompt}</div> : null}
      {ready ? <div className="savebar"><div className="savebar-in"><button type="button" className="btn btn-primary" onClick={() => setEditing(false)}>Done</button></div></div> : null}
    </div>
  );
}
