-- =====================================================================
-- Brew Notes: initial database setup
-- Run once in the Supabase SQL editor (or with `supabase db push`).
--
-- Safe to run on your existing project: it only CREATES new objects.
-- Nothing is dropped or altered. Everything runs in one transaction,
-- so if any object already exists the whole script stops and nothing
-- is changed.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- Profiles: one row per user, holding the username used to sign in.
-- Rows are created automatically by the trigger further down.
-- ---------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text not null unique,
  created_at  timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,30}$')
);

-- ---------------------------------------------------------------------
-- Coffees
-- ---------------------------------------------------------------------
create table public.coffees (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name         text not null check (length(btrim(name)) between 1 and 200),
  roaster      text,
  origin       text,
  roast_date   date,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  archived_at  timestamptz,
  constraint coffees_id_user_unique unique (id, user_id)
);

-- ---------------------------------------------------------------------
-- Brewers
-- ---------------------------------------------------------------------
create table public.brewers (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name         text not null check (length(btrim(name)) between 1 and 200),
  description  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  archived_at  timestamptz,
  constraint brewers_id_user_unique unique (id, user_id)
);

-- ---------------------------------------------------------------------
-- Recipes. `fields` is an ordered JSON array of field definitions:
--   [{ "id", "label", "type", "unit", "value" }, ...]
-- type is one of: number, text, duration (seconds), boolean, longtext.
-- The composite foreign key guarantees a recipe can only belong to a
-- brewer owned by the same user.
-- ---------------------------------------------------------------------
create table public.recipes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  brewer_id     uuid not null,
  name          text not null check (length(btrim(name)) between 1 and 200),
  description   text,
  instructions  text,
  fields        jsonb not null default '[]'::jsonb check (jsonb_typeof(fields) = 'array'),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  archived_at   timestamptz,
  constraint recipes_id_user_unique unique (id, user_id),
  constraint recipes_brewer_same_user
    foreign key (brewer_id, user_id) references public.brewers (id, user_id)
);

-- ---------------------------------------------------------------------
-- Brew logs. Each brew keeps a snapshot of the recipe (labels, units,
-- standard values and names) so history stays readable after edits.
-- Composite foreign keys stop a brew pointing at another user's coffee
-- or recipe, and block deleting a coffee or recipe that has history.
-- ---------------------------------------------------------------------
create table public.brew_logs (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  coffee_id        uuid not null,
  recipe_id        uuid not null,
  brewed_at        timestamptz not null default now(),
  actual_values    jsonb not null default '{}'::jsonb check (jsonb_typeof(actual_values) = 'object'),
  extra_fields     jsonb not null default '[]'::jsonb check (jsonb_typeof(extra_fields) = 'array'),
  recipe_snapshot  jsonb not null check (jsonb_typeof(recipe_snapshot) = 'object'),
  feedback         text,
  next_time_notes  text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint brew_logs_coffee_same_user
    foreign key (coffee_id, user_id) references public.coffees (id, user_id),
  constraint brew_logs_recipe_same_user
    foreign key (recipe_id, user_id) references public.recipes (id, user_id)
);

-- ---------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------
create index coffees_user_idx        on public.coffees (user_id);
create index brewers_user_idx        on public.brewers (user_id);
create index recipes_user_idx        on public.recipes (user_id);
create index recipes_brewer_idx      on public.recipes (brewer_id, user_id);
create index brew_logs_combo_idx     on public.brew_logs (user_id, coffee_id, recipe_id, brewed_at desc);
create index brew_logs_coffee_idx    on public.brew_logs (coffee_id, user_id);
create index brew_logs_recipe_idx    on public.brew_logs (recipe_id, user_id);

-- ---------------------------------------------------------------------
-- Keep updated_at current
-- ---------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger coffees_set_updated_at   before update on public.coffees   for each row execute function public.set_updated_at();
create trigger brewers_set_updated_at   before update on public.brewers   for each row execute function public.set_updated_at();
create trigger recipes_set_updated_at   before update on public.recipes   for each row execute function public.set_updated_at();
create trigger brew_logs_set_updated_at before update on public.brew_logs for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Create a profile when someone signs up. The app sends the chosen
-- username in the sign-up metadata.
-- ---------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, lower(btrim(new.raw_user_meta_data ->> 'username')));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Username sign-in helpers (callable before signing in).
-- Supabase Auth signs in with an email address, so the app looks up the
-- email that belongs to a username, then signs in with it.
-- ---------------------------------------------------------------------
create function public.username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.profiles where username = lower(btrim(p_username))
  );
$$;

create function public.email_for_username(p_username text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select u.email
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.username = lower(btrim(p_username));
$$;

revoke all on function public.username_available(text) from public;
revoke all on function public.email_for_username(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;
grant execute on function public.email_for_username(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Row Level Security: every user can only see and change their own rows.
-- ---------------------------------------------------------------------
alter table public.profiles  enable row level security;
alter table public.coffees   enable row level security;
alter table public.brewers   enable row level security;
alter table public.recipes   enable row level security;
alter table public.brew_logs enable row level security;

create policy "profiles: owner can read" on public.profiles
  for select to authenticated using (id = (select auth.uid()));

create policy "coffees: owner can read" on public.coffees
  for select to authenticated using (user_id = (select auth.uid()));
create policy "coffees: owner can insert" on public.coffees
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "coffees: owner can update" on public.coffees
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "coffees: owner can delete" on public.coffees
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "brewers: owner can read" on public.brewers
  for select to authenticated using (user_id = (select auth.uid()));
create policy "brewers: owner can insert" on public.brewers
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "brewers: owner can update" on public.brewers
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "brewers: owner can delete" on public.brewers
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "recipes: owner can read" on public.recipes
  for select to authenticated using (user_id = (select auth.uid()));
create policy "recipes: owner can insert" on public.recipes
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "recipes: owner can update" on public.recipes
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "recipes: owner can delete" on public.recipes
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "brew_logs: owner can read" on public.brew_logs
  for select to authenticated using (user_id = (select auth.uid()));
create policy "brew_logs: owner can insert" on public.brew_logs
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "brew_logs: owner can update" on public.brew_logs
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "brew_logs: owner can delete" on public.brew_logs
  for delete to authenticated using (user_id = (select auth.uid()));

grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.coffees, public.brewers, public.recipes, public.brew_logs to authenticated;

commit;
