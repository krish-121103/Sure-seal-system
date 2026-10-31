-- =====================================================================
-- Sure Seal Production System — Supabase database setup
-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- Safe to re-run: it only creates what is missing and refreshes the rules.
-- =====================================================================

-- ---------- Roles and user profiles ----------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null default '',
  email       text not null default '',
  role        text not null default 'none',
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- The signed-in person's role ('none' if no profile, disabled, or not signed in).
alter table public.profiles add column if not exists email text not null default '';
-- Roles: owner (everything, the only role that can see formulas), manager (everything
-- except formulas), production, warehouse, office.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('none','owner','manager','production','warehouse','office'));

create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid() and active),
    'none')
$$;

-- New logins get a profile automatically. The very first login becomes the
-- Owner so they can sign in and set everyone else up.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    split_part(coalesce(new.email, ''), '@', 1),
    coalesce(new.email, ''),
    case when exists (select 1 from public.profiles where role in ('owner','manager'))
         then 'none' else 'owner' end
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
drop policy if exists profiles_read   on public.profiles;
drop policy if exists profiles_update on public.profiles;
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.my_role() in ('owner','manager'));
create policy profiles_update on public.profiles for update to authenticated
  using (public.my_role() in ('owner','manager')) with check (public.my_role() in ('owner','manager'));
grant select, update on public.profiles to authenticated;

-- Managers can look after every login except owners, and can't make anyone an owner.
-- The last active owner can't be demoted or disabled (no lock-out).
create or replace function public.guard_profile() returns trigger
language plpgsql security definer set search_path = public as $$
declare me text := public.my_role();
begin
  if auth.uid() is not null and me <> 'owner'
     and (old.role = 'owner' or new.role = 'owner') then
    raise exception 'Only an owner can change an owner login or make someone an owner.';
  end if;
  if (old.role = 'owner' and old.active)
     and (new.role <> 'owner' or not new.active)
     and (select count(*) from public.profiles where role = 'owner' and active) <= 1 then
    raise exception 'At least one active owner is required.';
  end if;
  return new;
end $$;
drop trigger if exists guard_profile on public.profiles;
create trigger guard_profile before update on public.profiles
  for each row execute function public.guard_profile();

-- ---------- Document tables ------------------------------------------
-- Every table stores one record per row as JSON, which keeps the app flexible.
do $$
declare t text;
begin
  foreach t in array array[
    'materials','lots','products','batches','moves','expected','requests',
    'counts','config','labels','sds','secret_materials','formulas','secret_products','secret_sales']
  loop
    execute format($f$
      create table if not exists public.%I (
        id          text primary key,
        data        jsonb not null default '{}'::jsonb,
        updated_at  timestamptz not null default now(),
        updated_by  uuid default auth.uid()
      )$f$, t);
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

-- Movements are listed newest first, so keep their timestamp as a sortable column.
alter table public.moves add column if not exists at text
  generated always as (data->>'at') stored;
create index if not exists moves_at_idx on public.moves (at desc);

create or replace function public.touch_updated() returns trigger
language plpgsql as $$
begin new.updated_at := now(); new.updated_by := auth.uid(); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'materials','lots','products','batches','moves','expected','requests',
    'counts','config','labels','sds','secret_materials','formulas','secret_products','secret_sales']
  loop
    execute format('drop trigger if exists touch on public.%I', t);
    execute format('create trigger touch before update on public.%I for each row execute function public.touch_updated()', t);
  end loop;
end $$;

-- ---------- Who can read and change what -----------------------------
-- read  = roles that can see the table
-- ins / upd / del = roles that can add, change, delete rows
create or replace function public.apply_rules(
  t text, r text[], i text[], u text[], d text[]) returns void
language plpgsql as $$
begin
  execute format('drop policy if exists rd on public.%I', t);
  execute format('drop policy if exists ins on public.%I', t);
  execute format('drop policy if exists upd on public.%I', t);
  execute format('drop policy if exists del on public.%I', t);
  -- the owner can always do everything
  execute format('create policy rd on public.%I for select to authenticated using (public.my_role() = any (%L::text[] || ''{owner}''))', t, r);
  execute format('create policy ins on public.%I for insert to authenticated with check (public.my_role() = any (%L::text[] || ''{owner}''))', t, i);
  execute format('create policy upd on public.%I for update to authenticated using (public.my_role() = any (%L::text[] || ''{owner}'')) with check (public.my_role() = any (%L::text[] || ''{owner}''))', t, u, u);
  execute format('create policy del on public.%I for delete to authenticated using (public.my_role() = any (%L::text[] || ''{owner}''))', t, d);
end $$;

do $$
declare
  everyone text[] := array['manager','production','warehouse','office'];
  mgr      text[] := array['manager'];
  own      text[] := array[]::text[];   -- owner only
begin
  -- Confidential: ingredient names, suppliers, costs, prices (owners and managers).
  perform public.apply_rules('secret_materials', mgr, mgr, mgr, mgr);
  -- Formulas: owners only. Managers get what planning needs through formula_brief().
  perform public.apply_rules('formulas',         own, own, own, own);
  perform public.apply_rules('secret_products',  mgr, mgr, mgr, mgr);
  perform public.apply_rules('secret_sales',     mgr, mgr, mgr, mgr);

  -- Master data and settings: everyone reads, managers change.
  perform public.apply_rules('materials', everyone, mgr, mgr, mgr);
  perform public.apply_rules('products',  everyone, mgr, mgr, mgr);
  perform public.apply_rules('labels',    everyone, mgr, mgr, mgr);
  perform public.apply_rules('sds',       everyone, mgr, mgr, mgr);
  perform public.apply_rules('config',    everyone, mgr, mgr, mgr);

  -- Day-to-day records.
  perform public.apply_rules('lots', everyone,
    array['manager','production','warehouse'],
    array['manager','production','warehouse'], mgr);
  perform public.apply_rules('batches', everyone,
    mgr,                                         -- only managers plan batches (needs the formula)
    array['manager','production','warehouse','office'], mgr);
  perform public.apply_rules('moves', everyone, everyone, mgr, mgr);
  perform public.apply_rules('expected', everyone,
    array['manager','office','warehouse'],
    array['manager','office','warehouse','production'], mgr);   -- production updates a PO line when it receives against it
  perform public.apply_rules('requests', everyone, everyone,
    array['manager','office','warehouse','production'], mgr);
  perform public.apply_rules('counts', everyone,
    array['manager','production','warehouse'],
    array['manager','production','warehouse'], mgr);
end $$;

-- ---------- Write helpers (run with the caller's permissions) ---------
create or replace function public.jsonb_deep_merge(a jsonb, b jsonb) returns jsonb
language sql immutable as $$
  select case
    when jsonb_typeof(a) = 'object' and jsonb_typeof(b) = 'object' then (
      select coalesce(jsonb_object_agg(k,
        case when a ? k and b ? k then public.jsonb_deep_merge(a->k, b->k)
             when b ? k then b->k else a->k end), '{}'::jsonb)
      from (select jsonb_object_keys(a) k union select jsonb_object_keys(b)) keys)
    else b end
$$;

create or replace function public.doc_table_ok(t text) returns boolean
language sql immutable as $$
  select t = any (array['materials','lots','products','batches','moves','expected',
    'requests','counts','config','labels','sds','secret_materials','formulas','secret_products','secret_sales'])
$$;

-- Replace a whole record, creating it if missing.
create or replace function public.set_doc(p_table text, p_id text, p_data jsonb) returns void
language plpgsql security invoker set search_path = public as $$
declare n int;
begin
  if not public.doc_table_ok(p_table) then raise exception 'Unknown table %', p_table; end if;
  execute format('update public.%I set data = $1 where id = $2', p_table) using p_data, p_id;
  get diagnostics n = row_count;
  if n = 0 then
    execute format('insert into public.%I (id, data) values ($1, $2)', p_table) using p_id, p_data;
  end if;
end $$;

-- Merge fields into an existing record (nested objects merge, arrays replace).
create or replace function public.merge_doc(p_table text, p_id text, p_patch jsonb) returns integer
language plpgsql security invoker set search_path = public as $$
declare n int;
begin
  if not public.doc_table_ok(p_table) then raise exception 'Unknown table %', p_table; end if;
  execute format('update public.%I set data = public.jsonb_deep_merge(data, $1) where id = $2', p_table)
    using p_patch, p_id;
  get diagnostics n = row_count;
  return n;
end $$;

grant execute on function public.set_doc(text, text, jsonb)   to authenticated;
grant execute on function public.merge_doc(text, text, jsonb) to authenticated;
grant execute on function public.my_role()                    to authenticated;
revoke execute on function public.set_doc(text, text, jsonb)   from anon, public;
revoke execute on function public.merge_doc(text, text, jsonb) from anon, public;

-- ---------- Live updates ---------------------------------------------
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['materials','lots','products','batches','moves','expected',
      'requests','counts','config','labels','sds','secret_materials','formulas','secret_products','secret_sales','profiles']
    loop
      begin
        execute format('alter publication supabase_realtime add table public.%I', t);
      exception when duplicate_object then null;
      end;
    end loop;
  end if;
end $$;

-- ---------- Label artwork and logo storage ----------------------------
-- A private bucket: every role can view and download, only managers upload or delete.
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit)
    values ('artwork', 'artwork', false, 20971520)
    on conflict (id) do nothing;

    execute 'drop policy if exists artwork_read on storage.objects';
    execute 'drop policy if exists artwork_write on storage.objects';
    execute 'drop policy if exists artwork_update on storage.objects';
    execute 'drop policy if exists artwork_delete on storage.objects';
    execute $p$create policy artwork_read on storage.objects for select to authenticated
      using (bucket_id = 'artwork' and public.my_role() <> 'none')$p$;
    execute $p$create policy artwork_write on storage.objects for insert to authenticated
      with check (bucket_id = 'artwork' and public.my_role() in ('owner','manager'))$p$;
    execute $p$create policy artwork_update on storage.objects for update to authenticated
      using (bucket_id = 'artwork' and public.my_role() in ('owner','manager'))$p$;
    execute $p$create policy artwork_delete on storage.objects for delete to authenticated
      using (bucket_id = 'artwork' and public.my_role() in ('owner','manager'))$p$;
  end if;
end $$;

-- ---------- Starting settings ----------------------------------------
insert into public.config (id, data) values
  ('sites', '{"list":[{"id":"main","name":"Hallam","address":"","prefix":"SS-"}]}'::jsonb)
on conflict (id) do nothing;

-- ---------- Logins created before this script was run -----------------
insert into public.profiles (id, name, email, role)
select u.id, split_part(coalesce(u.email,''), '@', 1), coalesce(u.email,''), 'none'
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

update public.profiles set role = 'owner'
where id = (select id from public.profiles order by created_at limit 1)
  and not exists (select 1 from public.profiles where role in ('owner','manager'));

-- Set up before owners existed: the earliest active manager becomes the owner.
update public.profiles set role = 'owner'
where id = (select id from public.profiles where role = 'manager' and active order by created_at, email limit 1)
  and not exists (select 1 from public.profiles where role = 'owner');

-- ---------- What managers see of the formulas -------------------------
-- Name, version and the ingredient split that batch planning, costing and the
-- forecast need. Notes, history and editing stay with owners.
create or replace function public.formula_brief() returns table (id text, data jsonb)
language sql stable security definer set search_path = public as $$
  select f.id, jsonb_build_object(
      'name', f.data->'name', 'version', f.data->'version', 'brief', true,
      'lines', coalesce((select jsonb_agg(jsonb_build_object('rm', l->'rm', 'pct', l->'pct'))
                         from jsonb_array_elements(coalesce(f.data->'lines','[]'::jsonb)) l), '[]'::jsonb))
  from public.formulas f
  where public.my_role() in ('owner','manager')
$$;
revoke execute on function public.formula_brief() from anon, public;
grant execute on function public.formula_brief() to authenticated;
