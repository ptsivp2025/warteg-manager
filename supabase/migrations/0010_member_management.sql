-- ============================================================
-- MEMBER MANAGEMENT — invite by link + role assignment
-- ------------------------------------------------------------
-- warung_members.role has had 9 values since 0006, but nothing
-- in the app could ever create a second member (onboarding only
-- ever inserts the creating user as 'owner') and nothing read or
-- enforced the role column. This migration adds the missing
-- piece: an invite-by-link flow (no email/SMS provider required
-- — owner shares a link, e.g. via WhatsApp) and role editing,
-- both gated to the warung owner only for this batch.
--
-- Scope note (read before assuming this is "full RBAC"): this
-- migration does NOT add role checks to existing RPCs (checkout,
-- purchasing, recipes, etc.) — those still only check
-- is_warung_member, so once a second member exists they have the
-- same operational access regardless of role. That's a separate,
-- larger pass (was flagged in the original doc as Phase 3 work).
-- What this migration guarantees: only the owner can invite,
-- change roles, or remove members.
-- ============================================================

-- ------------------------------------------------------------
-- 1. INVITES
-- ------------------------------------------------------------
create table if not exists public.warung_invites (
  id uuid primary key default gen_random_uuid(),
  warung_id uuid not null references public.warungs(id) on delete cascade,
  email text not null,
  role text not null check (
    role in ('admin', 'manager', 'supervisor', 'cashier', 'kitchen', 'inventory', 'finance')
  ),
  token uuid not null default gen_random_uuid(),
  invited_by uuid not null references auth.users(id),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

create unique index if not exists uq_warung_invites_token on public.warung_invites(token);

-- One live pending invite per (warung, email) — re-inviting updates
-- the existing row (see create_warung_invite) instead of piling up.
create unique index if not exists uq_warung_invites_pending_email
  on public.warung_invites(warung_id, lower(email))
  where (status = 'pending');

create index if not exists idx_warung_invites_warung on public.warung_invites(warung_id);

alter table public.warung_invites enable row level security;

-- Only the owner can see/manage the invite list for their warung.
-- Invitees never query this table directly — they go through
-- get_invite_by_token() below, which is the only thing that needs
-- to work pre-membership (and pre-login, for the "you're invited"
-- screen).
drop policy if exists "warung_invites_owner_all" on public.warung_invites;
create policy "warung_invites_owner_all" on public.warung_invites
  for all using (public.is_warung_owner(warung_id))
  with check (public.is_warung_owner(warung_id));

-- ------------------------------------------------------------
-- 2. warung_members — allow role updates (there was no UPDATE
--    policy at all before this; only insert/select/delete existed)
-- ------------------------------------------------------------
drop policy if exists "members_update" on public.warung_members;
create policy "members_update" on public.warung_members
  for update using (
    public.is_warung_owner(warung_id) and role <> 'owner'
  )
  with check (
    public.is_warung_owner(warung_id) and role <> 'owner'
  );
-- Note: both USING and CHECK exclude role = 'owner', so this policy
-- can never be used to touch the owner's own row (demote or
-- otherwise) or to promote someone else to 'owner'. Ownership
-- transfer is intentionally out of scope here.

-- ------------------------------------------------------------
-- 3. Helper: caller's role in a warung (for future enforcement +
--    for the UI to show "peran kamu: ...")
-- ------------------------------------------------------------
create or replace function public.current_member_role(_warung_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.warung_members
  where warung_id = _warung_id and user_id = auth.uid()
  limit 1;
$$;

grant execute on function public.current_member_role(uuid) to authenticated;

-- ------------------------------------------------------------
-- 3b. List members with email — auth.users isn't exposed over
--     PostgREST, so the UI needs this to show who's who.
--     Readable by any member of the warung (not owner-only): it's
--     just names/roles, same visibility level as e.g. who created
--     a transaction.
-- ------------------------------------------------------------
create or replace function public.list_warung_members(_warung_id uuid)
returns table (
  id uuid,
  user_id uuid,
  email text,
  role text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select m.id, m.user_id, u.email, m.role, m.created_at
  from public.warung_members m
  join auth.users u on u.id = m.user_id
  where m.warung_id = _warung_id
    and public.is_warung_member(_warung_id)
  order by (m.role = 'owner') desc, m.created_at asc;
$$;

grant execute on function public.list_warung_members(uuid) to authenticated;

-- ------------------------------------------------------------
-- 4. Create/refresh an invite (owner only)
-- ------------------------------------------------------------
create or replace function public.create_warung_invite(
  _warung_id uuid,
  _email text,
  _role text
)
returns public.warung_invites
language plpgsql
security definer
set search_path = public
as $$
declare
  _invite public.warung_invites%rowtype;
  _clean_email text := lower(trim(_email));
begin
  if not public.is_warung_owner(_warung_id) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if _clean_email = '' or _clean_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid_email' using errcode = '22023';
  end if;

  if _role not in ('admin', 'manager', 'supervisor', 'cashier', 'kitchen', 'inventory', 'finance') then
    raise exception 'invalid_role' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.warung_members m
    join auth.users u on u.id = m.user_id
    where m.warung_id = _warung_id and lower(u.email) = _clean_email
  ) then
    raise exception 'already_member' using errcode = '23505';
  end if;

  insert into public.warung_invites (warung_id, email, role, invited_by)
  values (_warung_id, _clean_email, _role, auth.uid())
  on conflict (warung_id, lower(email)) where (status = 'pending')
  do update set
    role = excluded.role,
    expires_at = now() + interval '7 days',
    created_at = now(),
    invited_by = excluded.invited_by
  returning * into _invite;

  return _invite;
end;
$$;

grant execute on function public.create_warung_invite(uuid, text, text) to authenticated;

-- ------------------------------------------------------------
-- 5. Look up an invite by token — no membership/login required.
--    Deliberately returns only what the "you're invited" screen
--    needs, never the invite list. The token itself (a random
--    uuid, unguessable) is the credential.
-- ------------------------------------------------------------
create or replace function public.get_invite_by_token(_token uuid)
returns table (
  warung_name text,
  role text,
  status text,
  email text,
  expired boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select w.name, i.role, i.status, i.email, (i.expires_at < now())
  from public.warung_invites i
  join public.warungs w on w.id = i.warung_id
  where i.token = _token;
$$;

grant execute on function public.get_invite_by_token(uuid) to authenticated, anon;

-- ------------------------------------------------------------
-- 6. Accept an invite (must be logged in, email must match)
-- ------------------------------------------------------------
create or replace function public.accept_warung_invite(_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _invite public.warung_invites%rowtype;
  _uid uuid := auth.uid();
  _auth_email text;
begin
  if _uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into _invite from public.warung_invites where token = _token for update;
  if not found then
    raise exception 'invite_not_found' using errcode = 'P0002';
  end if;
  if _invite.status <> 'pending' then
    raise exception 'invite_not_pending' using errcode = '22023';
  end if;
  if _invite.expires_at < now() then
    raise exception 'invite_expired' using errcode = '22023';
  end if;

  select email into _auth_email from auth.users where id = _uid;
  if _auth_email is null or lower(_auth_email) <> _invite.email then
    raise exception 'email_mismatch' using errcode = '28000';
  end if;

  if not exists (
    select 1 from public.warung_members
    where warung_id = _invite.warung_id and user_id = _uid
  ) then
    insert into public.warung_members (warung_id, user_id, role)
    values (_invite.warung_id, _uid, _invite.role);
  end if;

  update public.warung_invites
  set status = 'accepted', accepted_at = now()
  where id = _invite.id;

  return _invite.warung_id;
end;
$$;

grant execute on function public.accept_warung_invite(uuid) to authenticated;
