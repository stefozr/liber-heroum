-- ============================================================================
-- Draw Steel — Supabase schema, security, and helper functions
-- ----------------------------------------------------------------------------
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query → Run)
-- on a fresh project. It is idempotent enough to re-run during setup, but on a
-- project with real data prefer migrations.
--
-- Design notes:
--  • The full character blob lives in characters.data (jsonb). A few fields
--    (owner_id, campaign_id, name, status, level) are promoted to columns for
--    filtering and row-level-security checks.
--  • Cross-user campaigns are made safe by RLS. Membership/director checks go
--    through SECURITY DEFINER helper functions (is_member/is_director) so the
--    policies don't recurse (campaigns ⇄ campaign_members).
--  • Joining a campaign and creating one go through RPCs so the client never
--    needs broad INSERT rights and invite codes aren't a readable table scan.
-- ============================================================================

-- ─── Tables ─────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id            uuid primary key references auth.users on delete cascade,
  display_name  text not null,
  avatar        text,                       -- optional uploaded avatar URL (initials fallback in UI)
  provider      text,                       -- 'email' | 'discord' | 'google'
  created_at    timestamptz not null default now()
);

create table if not exists public.campaigns (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text not null default '',
  gm_id         uuid not null references public.profiles on delete cascade,
  invite_code   text unique not null,       -- set by create_campaign() via gen_invite_code()
  created_at    timestamptz not null default now()
);

create table if not exists public.campaign_members (
  campaign_id   uuid not null references public.campaigns on delete cascade,
  user_id       uuid not null references public.profiles on delete cascade,
  role          text not null check (role in ('director','player')),
  primary key (campaign_id, user_id)
);

create table if not exists public.characters (
  id            text primary key,           -- client-supplied ('c…'); see app.jsx uid()
  owner_id      uuid not null references public.profiles on delete cascade,
  campaign_id   uuid references public.campaigns on delete set null,  -- "release", never delete
  name          text,
  status        text,
  level         int,
  data          jsonb not null,
  updated_at    timestamptz not null default now()
);

create index if not exists characters_owner_idx    on public.characters (owner_id);
create index if not exists characters_campaign_idx on public.characters (campaign_id);
create index if not exists members_user_idx         on public.campaign_members (user_id);

-- Superusers. Membership is granted ONLY via the SQL editor / service role — there is
-- deliberately no insert/update/delete RLS policy below, so a normal user cannot
-- promote themselves (which they could if this were a self-editable column on profiles).
create table if not exists public.admins (
  user_id uuid primary key references public.profiles on delete cascade
);

-- ─── Invite-code generator (ambiguity-free alphabet, format ABC-DEF) ──────────
-- Used as the default for campaigns.invite_code. Loops until it finds a free
-- code. Mirrors the old client-side makeInviteCode().

create or replace function public.gen_invite_code()
returns text
language plpgsql
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- no 0/O, 1/I
  code text;
  i int;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, floor(random() * length(alphabet))::int + 1, 1);
    end loop;
    code := substr(code, 1, 3) || '-' || substr(code, 4, 3);
    exit when not exists (select 1 from public.campaigns where invite_code = code);
  end loop;
  return code;
end;
$$;

-- ─── RLS membership/director helpers (SECURITY DEFINER → no policy recursion) ─

create or replace function public.is_member(cid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.campaign_members
    where campaign_id = cid and user_id = auth.uid()
  );
$$;

create or replace function public.is_director(cid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.campaigns
    where id = cid and gm_id = auth.uid()
  );
$$;

-- Is the caller a superuser? (See the admins table above.)
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.admins where user_id = auth.uid()
  );
$$;

-- ─── Enable RLS ───────────────────────────────────────────────────────────────

alter table public.profiles         enable row level security;
alter table public.campaigns         enable row level security;
alter table public.campaign_members  enable row level security;
alter table public.characters        enable row level security;
alter table public.admins            enable row level security;

-- ─── Policies: admins ────────────────────────────────────────────────────────
-- Readable by any signed-in user (the client checks its own admin status). There is
-- intentionally NO write policy: grants happen only via the SQL editor / service role.
drop policy if exists admins_select on public.admins;
create policy admins_select on public.admins
  for select to authenticated using (true);

-- ─── Policies: profiles ────────────────────────────────────────────────────
-- Display name + avatar are low-sensitivity, and party screens need to show
-- co-members. Any signed-in user may read profiles; you may only edit your own.
-- INSERT is handled by the signup trigger (SECURITY DEFINER), so no insert policy.

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (true);

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- The signup trigger creates profiles (SECURITY DEFINER, bypasses RLS). This
-- policy only backstops the client's defensive self-upsert: you may insert your
-- own row, never someone else's.
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated with check (id = auth.uid());

-- ─── Policies: campaigns ────────────────────────────────────────────────────
-- Members (and the GM) may read; only the GM may change/disband. Creation goes
-- through create_campaign() RPC, so no broad INSERT policy is needed.

drop policy if exists campaigns_select on public.campaigns;
create policy campaigns_select on public.campaigns
  for select to authenticated
  using (gm_id = auth.uid() or public.is_member(id) or public.is_admin());

drop policy if exists campaigns_update on public.campaigns;
create policy campaigns_update on public.campaigns
  for update to authenticated
  using (gm_id = auth.uid()) with check (gm_id = auth.uid());

drop policy if exists campaigns_delete on public.campaigns;
create policy campaigns_delete on public.campaigns
  for delete to authenticated
  using (gm_id = auth.uid());

-- ─── Policies: campaign_members ─────────────────────────────────────────────
-- Members may read the roster. Joining is via join_campaign() RPC (no INSERT
-- policy). A director may remove anyone (kick); a user may remove themselves
-- (leave).

drop policy if exists members_select on public.campaign_members;
create policy members_select on public.campaign_members
  for select to authenticated
  using (public.is_member(campaign_id));

drop policy if exists members_delete on public.campaign_members;
create policy members_delete on public.campaign_members
  for delete to authenticated
  using (user_id = auth.uid() or public.is_director(campaign_id));

-- ─── Policies: characters ───────────────────────────────────────────────────
-- SELECT: owner, or any member of the character's campaign (party can see sheets).
-- INSERT/UPDATE: owner, or the director of the character's campaign
--   (encodes the "Director has full edit" rule).
-- DELETE: owner only.
-- A superuser (is_admin) bypasses all of these — full read/write/delete everywhere.

drop policy if exists characters_select on public.characters;
create policy characters_select on public.characters
  for select to authenticated
  using (owner_id = auth.uid() or public.is_member(campaign_id) or public.is_admin());

drop policy if exists characters_insert on public.characters;
create policy characters_insert on public.characters
  for insert to authenticated
  with check (owner_id = auth.uid() or public.is_director(campaign_id) or public.is_admin());

drop policy if exists characters_update on public.characters;
create policy characters_update on public.characters
  for update to authenticated
  using (owner_id = auth.uid() or public.is_director(campaign_id) or public.is_admin())
  with check (owner_id = auth.uid() or public.is_director(campaign_id) or public.is_admin());

drop policy if exists characters_delete on public.characters;
create policy characters_delete on public.characters
  for delete to authenticated
  using (owner_id = auth.uid() or public.is_admin());

-- ─── RPC: create a campaign (campaign + director membership atomically) ──────

create or replace function public.create_campaign(p_name text, p_description text default '')
returns public.campaigns
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.campaigns;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  insert into public.campaigns (name, description, gm_id, invite_code)
  values (coalesce(nullif(trim(p_name), ''), 'Untitled Campaign'), coalesce(p_description, ''), auth.uid(), public.gen_invite_code())
  returning * into c;
  insert into public.campaign_members (campaign_id, user_id, role)
  values (c.id, auth.uid(), 'director');
  return c;
end;
$$;

-- ─── RPC: join a campaign by invite code ─────────────────────────────────────
-- SECURITY DEFINER so the code→campaign lookup isn't a readable table scan and
-- the caller doesn't need INSERT rights on campaign_members.

create or replace function public.join_campaign(p_code text)
returns public.campaigns
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.campaigns;
  norm text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  -- normalize: uppercase, strip everything but A-Z0-9 (mirrors findByCode)
  norm := regexp_replace(upper(coalesce(p_code, '')), '[^A-Z0-9]', '', 'g');
  select * into c from public.campaigns
   where regexp_replace(upper(invite_code), '[^A-Z0-9]', '', 'g') = norm;
  if c.id is null then
    raise exception 'No campaign answers to that sigil. Check it and try again.';
  end if;
  insert into public.campaign_members (campaign_id, user_id, role)
  values (c.id, auth.uid(), 'player')
  on conflict (campaign_id, user_id) do nothing;
  return c;
end;
$$;

-- ─── RPC: regenerate a campaign's invite code (director only) ─────────────────

create or replace function public.regen_invite_code(p_campaign uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_code text;
begin
  if not public.is_director(p_campaign) then
    raise exception 'Only the Director may regenerate the sigil.';
  end if;
  new_code := public.gen_invite_code();
  update public.campaigns set invite_code = new_code where id = p_campaign;
  return new_code;
end;
$$;

-- ─── Profile auto-creation on signup ─────────────────────────────────────────
-- display_name comes from sign-up metadata: email signup passes options.data,
-- OAuth provides full_name/name; fall back to the email local-part.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, provider)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'display_name', ''),
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'name', ''),
      split_part(new.email, '@', 1)
    ),
    coalesce(new.raw_app_meta_data->>'provider', 'email')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Storage: portraits bucket ───────────────────────────────────────────────
-- Public-read bucket for character portraits. Authenticated users may upload;
-- a user may modify/delete only files under their own uid/ prefix.

insert into storage.buckets (id, name, public)
values ('portraits', 'portraits', true)
on conflict (id) do nothing;

drop policy if exists portraits_read on storage.objects;
create policy portraits_read on storage.objects
  for select using (bucket_id = 'portraits');

drop policy if exists portraits_insert on storage.objects;
create policy portraits_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'portraits' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists portraits_update on storage.objects;
create policy portraits_update on storage.objects
  for update to authenticated
  using (bucket_id = 'portraits' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists portraits_delete on storage.objects;
create policy portraits_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'portraits' and (storage.foldername(name))[1] = auth.uid()::text);

-- ─── Grant superuser (run manually; do NOT commit a real email) ──────────────
-- Make an account a superuser by inserting it here from the SQL editor. The user
-- must have signed in at least once (so their auth.users / profiles row exists).
--
--   insert into public.admins (user_id)
--   select id from auth.users where email = 'you@example.com'
--   on conflict do nothing;
--
-- Revoke with:  delete from public.admins where user_id = (select id from auth.users where email = 'you@example.com');
