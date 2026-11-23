-- Recordly complete database setup & security upgrade.
-- Safe to run on both a fresh Supabase project and an existing Recordly database.
-- Paste all of this into Supabase > SQL Editor > Run.

create extension if not exists pgcrypto;

-- =========================================================================
-- 1. CORE TABLES
-- =========================================================================
create table if not exists records(
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null,
  description text,
  target numeric,
  end_date date,
  freq text default 'once',
  start_date date,
  period_amount numeric,
  show_table boolean not null default false,
  group_link boolean not null default false,
  hide_balance boolean not null default false,
  discoverable boolean not null default false,
  created_at timestamptz not null default now()
);
alter table records add column if not exists description text;
alter table records add column if not exists freq text default 'once';
alter table records add column if not exists start_date date;
alter table records add column if not exists period_amount numeric;
alter table records add column if not exists hide_balance boolean not null default false;
alter table records add column if not exists discoverable boolean not null default false;

create table if not exists people(
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references records on delete cascade,
  name text not null,
  phone text,
  email text,
  due_date date,
  installment_plan jsonb,
  user_id uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);
alter table people add column if not exists email text;
alter table people add column if not exists due_date date;
alter table people add column if not exists installment_plan jsonb;

create table if not exists payments(
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people on delete cascade,
  amount numeric not null check (amount > 0),
  paid_on date not null default current_date,
  paid_at timestamptz,
  method text,
  payer_name text,
  payer_phone text,
  note text,
  logged_by uuid references auth.users on delete set null,
  edited_at timestamptz,
  edit_reason text,
  voided boolean not null default false,
  voided_at timestamptz,
  void_reason text,
  proof_path text,
  change_log jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
alter table payments add column if not exists paid_at timestamptz;
alter table payments add column if not exists method text;
alter table payments add column if not exists payer_name text;
alter table payments add column if not exists payer_phone text;
alter table payments add column if not exists logged_by uuid references auth.users on delete set null;
alter table payments add column if not exists edited_at timestamptz;
alter table payments add column if not exists edit_reason text;
alter table payments add column if not exists voided boolean not null default false;
alter table payments add column if not exists voided_at timestamptz;
alter table payments add column if not exists void_reason text;
alter table payments add column if not exists proof_path text;
alter table payments add column if not exists change_log jsonb not null default '[]'::jsonb;
alter table payments add column if not exists buyer_liked boolean not null default false;
alter table payments add column if not exists buyer_liked_at timestamptz;

create table if not exists payment_audit_logs(
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments on delete cascade,
  person_id uuid not null references people on delete cascade,
  record_id uuid not null references records on delete cascade,
  actor_id uuid references auth.users on delete set null,
  actor_name text,
  action text not null check (action in ('created', 'edited', 'voided', 'restored')),
  reason text,
  previous_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_payment_audit_payment on payment_audit_logs(payment_id, created_at desc);

create table if not exists payment_reports(
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments on delete cascade,
  person_id uuid not null references people on delete cascade,
  record_id uuid not null references records on delete cascade,
  owner_id uuid not null references auth.users on delete cascade,
  reporter_id uuid references auth.users on delete set null,
  reporter_name text not null,
  reason text not null,
  expected_amount numeric,
  details text,
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  resolution_note text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_payment_reports_owner on payment_reports(owner_id, status, created_at desc);

create table if not exists comments(
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people on delete cascade,
  author_id uuid not null references auth.users on delete cascade,
  author_name text,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists group_messages(
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references records on delete cascade,
  author_id uuid not null references auth.users on delete cascade,
  author_name text not null,
  body text not null check (char_length(trim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists idx_group_messages_rec_time on group_messages(record_id, created_at);

create table if not exists rc_profiles(
  id uuid primary key references auth.users on delete cascade,
  display_name text not null,
  searchable boolean not null default true,
  tos_accepted_at timestamptz,
  tos_version text,
  updated_at timestamptz not null default now()
);
alter table rc_profiles add column if not exists searchable boolean not null default true;
alter table rc_profiles add column if not exists tos_accepted_at timestamptz;
alter table rc_profiles add column if not exists tos_version text;

create table if not exists join_requests(
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references records on delete cascade,
  owner_id uuid not null references auth.users on delete cascade,
  requester_id uuid not null references auth.users on delete cascade,
  requester_name text not null,
  requester_phone text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  person_id uuid references people on delete set null,
  retry_after timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists visits(
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users on delete cascade,
  record_id uuid references records on delete cascade,
  person_id uuid references people on delete cascade,
  source text not null default 'link',
  visitor_name text,
  created_at timestamptz not null default now()
);

create table if not exists user_backups(
  user_id uuid primary key references auth.users on delete cascade,
  backup jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists user_blocks(
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null default auth.uid() references auth.users on delete cascade,
  blocked_user_id uuid references auth.users on delete cascade,
  blocked_record_id uuid references records on delete cascade,
  label text,
  created_at timestamptz not null default now(),
  check (blocked_user_id is not null or blocked_record_id is not null)
);
create index if not exists idx_user_blocks_blocker on user_blocks(blocker_id);

create table if not exists abuse_reports(
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users on delete set null,
  record_id uuid references records on delete set null,
  target_user_id uuid references auth.users on delete set null,
  reason text not null,
  details text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists push_subscriptions(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_push_subs_user on push_subscriptions(user_id);

create table if not exists notifications(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  kind text not null default 'info',
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_user on notifications(user_id, created_at desc);

-- =========================================================================
-- 2. STAFF ACCOUNTS (RBAC) & DATABASE-ENFORCED PLANS
-- =========================================================================
create table if not exists team_members(
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  staff_user_id uuid references auth.users on delete cascade,
  staff_email text,
  staff_phone text,
  staff_name text,
  role text not null default 'staff' check (role in ('staff')),
  status text not null default 'pending' check (status in ('pending', 'active', 'revoked')),
  permissions jsonb not null default '{"log_payments":true,"add_members":true,"delete_records":false,"delete_account":false}'::jsonb,
  invite_code text not null default encode(gen_random_bytes(8), 'hex'),
  created_at timestamptz not null default now()
);
alter table team_members add column if not exists staff_phone text;
alter table team_members alter column staff_email drop not null;
alter table team_members drop constraint if exists team_members_owner_id_staff_email_key;
create unique index if not exists idx_team_owner_email on team_members(owner_id, lower(staff_email)) where staff_email is not null;
create unique index if not exists idx_team_owner_phone on team_members(owner_id, staff_phone) where staff_phone is not null;
create index if not exists idx_team_staff_user on team_members(staff_user_id, status);

create or replace function normalize_phone(raw text) returns text
language plpgsql immutable set search_path = public as $$
declare d text;
begin
  d := regexp_replace(coalesce(raw, ''), '[^0-9+]', '', 'g');
  if d = '' then return ''; end if;
  if left(d, 1) = '0' and char_length(d) = 11 then
    return '+234' || substr(d, 2);
  end if;
  if left(d, 1) <> '+' then
    if char_length(d) >= 10 then return '+' || d; end if;
  end if;
  return d;
end $$;

create table if not exists user_plans(
  user_id uuid primary key references auth.users on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro', 'business')),
  status text not null default 'active',
  max_records int not null default 3,
  max_members_per_record int not null default 25,
  max_staff int not null default 0,
  updated_at timestamptz not null default now()
);

create or replace function is_active_staff(target_owner uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (
    select 1 from team_members tm
    where tm.owner_id = target_owner
      and tm.staff_user_id = auth.uid()
      and tm.status = 'active'
  );
$$;

create or replace function get_owner_plan_limits(target_owner uuid)
returns table(plan text, max_records int, max_members_per_record int, max_staff int)
language sql stable security definer set search_path = public as $$
  select
    coalesce(up.plan, 'free'),
    coalesce(up.max_records, 3),
    coalesce(up.max_members_per_record, 25),
    coalesce(up.max_staff, 0)
  from (select target_owner as uid) u
  left join user_plans up on up.user_id = u.uid;
$$;

create or replace function enforce_record_plan_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare lim record; cur_cnt int;
begin
  select * into lim from get_owner_plan_limits(new.owner_id);
  if lim.max_records > 0 then
    select count(*) into cur_cnt from records where owner_id = new.owner_id and id <> new.id;
    if cur_cnt >= lim.max_records then
      raise exception 'PLAN_LIMIT_RECORDS: Your % plan allows up to % contribution groups. Upgrade to Pro or Business to create more.', lim.plan, lim.max_records;
    end if;
  end if;
  return new;
end $$;

create or replace function enforce_member_plan_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare rec_owner uuid; lim record; cur_cnt int;
begin
  select owner_id into rec_owner from records where id = new.record_id;
  if rec_owner is null then return new; end if;
  select * into lim from get_owner_plan_limits(rec_owner);
  if lim.max_members_per_record > 0 then
    select count(*) into cur_cnt from people where record_id = new.record_id and id <> new.id;
    if cur_cnt >= lim.max_members_per_record then
      raise exception 'PLAN_LIMIT_MEMBERS: Your % plan allows up to % members per group. Upgrade to add more.', lim.plan, lim.max_members_per_record;
    end if;
  end if;
  return new;
end $$;

create or replace function enforce_staff_plan_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare lim record; cur_cnt int;
begin
  if new.status = 'revoked' then return new; end if;
  select * into lim from get_owner_plan_limits(new.owner_id);
  if lim.max_staff = 0 then
    raise exception 'PLAN_LIMIT_STAFF: Staff helper accounts require a Pro or Business plan.';
  end if;
  if lim.max_staff > 0 then
    select count(*) into cur_cnt from team_members where owner_id = new.owner_id and status in ('pending', 'active') and id <> new.id;
    if cur_cnt >= lim.max_staff then
      raise exception 'PLAN_LIMIT_STAFF: Your % plan allows up to % staff accounts.', lim.plan, lim.max_staff;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_enforce_record_limit on records;
create trigger trg_enforce_record_limit before insert on records for each row execute function enforce_record_plan_limit();

drop trigger if exists trg_enforce_member_limit on people;
create trigger trg_enforce_member_limit before insert on people for each row execute function enforce_member_plan_limit();

drop trigger if exists trg_enforce_staff_limit on team_members;
create trigger trg_enforce_staff_limit before insert on team_members for each row execute function enforce_staff_plan_limit();

-- =========================================================================
-- 3. ROW LEVEL SECURITY POLICIES
-- =========================================================================
alter table records enable row level security;
alter table people enable row level security;
alter table payments enable row level security;
alter table payment_audit_logs enable row level security;
alter table payment_reports enable row level security;
alter table comments enable row level security;
alter table group_messages enable row level security;
alter table rc_profiles enable row level security;
alter table join_requests enable row level security;
alter table visits enable row level security;
alter table user_backups enable row level security;
alter table user_blocks enable row level security;
alter table abuse_reports enable row level security;
alter table push_subscriptions enable row level security;
alter table notifications enable row level security;
alter table team_members enable row level security;
alter table user_plans enable row level security;

-- Records: owner full access; active staff read-only
drop policy if exists rec_owner on records;
create policy rec_owner on records for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists rec_staff_select on records;
create policy rec_staff_select on records for select using (is_active_staff(owner_id));

-- People: owner full access; active staff select + insert + update (NO delete); buyer select own
drop policy if exists ppl_owner on people;
create policy ppl_owner on people for all
  using (exists (select 1 from records r where r.id = record_id and r.owner_id = auth.uid()))
  with check (exists (select 1 from records r where r.id = record_id and r.owner_id = auth.uid()));
drop policy if exists ppl_staff_select on people;
create policy ppl_staff_select on people for select
  using (exists (select 1 from records r where r.id = record_id and is_active_staff(r.owner_id)));
drop policy if exists ppl_staff_insert on people;
create policy ppl_staff_insert on people for insert
  with check (exists (select 1 from records r where r.id = record_id and is_active_staff(r.owner_id)));
drop policy if exists ppl_self on people;
create policy ppl_self on people for select using (user_id = auth.uid());

-- Payments: server-authoritative writes ONLY via SECURITY DEFINER RPCs (rc_log_payment, rc_edit_payment, rc_void_payment, rc_react_payment).
-- Direct client INSERT/UPDATE/DELETE policies are intentionally omitted for accountability.
drop policy if exists pay_owner on payments;
drop policy if exists pay_owner_select on payments;
create policy pay_owner_select on payments for select
  using (exists (select 1 from people p join records r on r.id = p.record_id where p.id = person_id and r.owner_id = auth.uid()));
drop policy if exists pay_staff_select on payments;
create policy pay_staff_select on payments for select
  using (exists (select 1 from people p join records r on r.id = p.record_id where p.id = person_id and is_active_staff(r.owner_id)));
drop policy if exists pay_staff_insert on payments;
drop policy if exists pay_self on payments;
create policy pay_self on payments for select
  using (exists (select 1 from people p where p.id = person_id and p.user_id = auth.uid()));

-- Payment Audit Logs: readable by owner, staff, and the buyer; written only via SECURITY DEFINER RPCs
drop policy if exists pal_read on payment_audit_logs;
create policy pal_read on payment_audit_logs for select using (
  exists (select 1 from records r where r.id = record_id and (r.owner_id = auth.uid() or is_active_staff(r.owner_id)))
  or exists (select 1 from people p where p.id = person_id and p.user_id = auth.uid())
);

-- Payment Reports: owner & staff & reporter can read; owner can update status
drop policy if exists pr_owner_select on payment_reports;
create policy pr_owner_select on payment_reports for select using (
  owner_id = auth.uid() or is_active_staff(owner_id) or reporter_id = auth.uid()
  or exists (select 1 from people p where p.id = person_id and p.user_id = auth.uid())
);
drop policy if exists pr_owner_update on payment_reports;
create policy pr_owner_update on payment_reports for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Group Messages
drop policy if exists gm_member_select on group_messages;
create policy gm_member_select on group_messages for select using (
  exists (select 1 from records r where r.id = record_id and (r.owner_id = auth.uid() or is_active_staff(r.owner_id)))
  or exists (select 1 from people p where p.record_id = group_messages.record_id and p.user_id = auth.uid())
);
drop policy if exists gm_member_insert on group_messages;
create policy gm_member_insert on group_messages for insert with check (
  auth.uid() is not null
  and author_id = auth.uid()
  and (
    exists (select 1 from records r where r.id = record_id and (r.owner_id = auth.uid() or is_active_staff(r.owner_id)))
    or exists (select 1 from people p where p.record_id = group_messages.record_id and p.user_id = auth.uid())
  )
);

-- Profiles, Join Requests, Visits, Backups, Blocks, Abuse Reports, Push Subs, Notifications, Team, Plans
drop policy if exists prof_self on rc_profiles;
create policy prof_self on rc_profiles for all using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists jr_owner on join_requests;
create policy jr_owner on join_requests for select using (owner_id = auth.uid() or requester_id = auth.uid());

drop policy if exists vis_owner on visits;
create policy vis_owner on visits for select using (owner_id = auth.uid());

drop policy if exists ub_self on user_backups;
create policy ub_self on user_backups for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists blk_self on user_blocks;
create policy blk_self on user_blocks for all using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

drop policy if exists ar_self on abuse_reports;
create policy ar_self on abuse_reports for select using (reporter_id = auth.uid());

drop policy if exists push_self on push_subscriptions;
create policy push_self on push_subscriptions for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists notif_self on notifications;
create policy notif_self on notifications for select using (user_id = auth.uid());
drop policy if exists notif_self_upd on notifications;
create policy notif_self_upd on notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists tm_owner on team_members;
create policy tm_owner on team_members for select using (owner_id = auth.uid() or staff_user_id = auth.uid());
drop policy if exists tm_owner_del on team_members;
create policy tm_owner_del on team_members for delete using (owner_id = auth.uid());

-- user_plans: read-only for the user; mutations only via server/RPCs so limits cannot be tampered with
drop policy if exists up_self on user_plans;
create policy up_self on user_plans for select using (user_id = auth.uid());

-- =========================================================================
-- 4. STORAGE BUCKET & POLICIES FOR PROOF OF PAYMENT SCREENSHOTS
-- =========================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-proofs', 'payment-proofs', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

drop policy if exists proofs_insert on storage.objects;
create policy proofs_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'payment-proofs'
  and exists (
    select 1 from records r
    where r.id::text = (storage.foldername(name))[1]
      and (r.owner_id = auth.uid() or is_active_staff(r.owner_id))
  )
);

drop policy if exists proofs_select on storage.objects;
create policy proofs_select on storage.objects for select to authenticated
using (
  bucket_id = 'payment-proofs'
  and (
    exists (
      select 1 from records r
      where r.id::text = (storage.foldername(name))[1]
        and (r.owner_id = auth.uid() or is_active_staff(r.owner_id))
    )
    or exists (
      select 1 from people p
      where p.id::text = (storage.foldername(name))[2]
        and p.record_id::text = (storage.foldername(name))[1]
        and p.user_id = auth.uid()
    )
  )
);

drop policy if exists proofs_update_owner on storage.objects;
create policy proofs_update_owner on storage.objects for update to authenticated
using (
  bucket_id = 'payment-proofs'
  and exists (select 1 from records r where r.id::text = (storage.foldername(name))[1] and r.owner_id = auth.uid())
);

drop policy if exists proofs_delete_owner on storage.objects;
create policy proofs_delete_owner on storage.objects for delete to authenticated
using (
  bucket_id = 'payment-proofs'
  and exists (select 1 from records r where r.id::text = (storage.foldername(name))[1] and r.owner_id = auth.uid())
);

-- =========================================================================
-- 5. TRUST, AUDIT, REPORT, PRIVACY, SAFETY, TEAM & PLAN RPC FUNCTIONS
-- =========================================================================
drop function if exists rc_person_view(uuid);
drop function if exists get_person_view(uuid);
create or replace function get_person_view(pid uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p people; r records; me boolean; res jsonb;
begin
  select * into p from people where id = pid;
  if not found then return null; end if;
  select * into r from records where id = p.record_id;
  me := auth.uid() is not null and (p.user_id = auth.uid() or r.owner_id = auth.uid() or is_active_staff(r.owner_id));
  res := jsonb_build_object(
    'name', p.name,
    'record_id', r.id,
    'title', r.title,
    'description', r.description,
    'target', r.target,
    'end_date', r.end_date,
    'due_date', p.due_date,
    'installment_plan', p.installment_plan,
    'show_table', r.show_table,
    'hide_balance', r.hide_balance,
    'claimed', p.user_id is not null,
    'me', me,
    'payments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'amount', amount,
        'paid_on', paid_on,
        'paid_at', paid_at,
        'method', method,
        'note', case when me then note end,
        'edited_at', edited_at,
        'edit_reason', edit_reason,
        'voided', voided,
        'voided_at', voided_at,
        'void_reason', void_reason,
        'proof_path', case when me then proof_path else null end,
        'change_log', change_log,
        'buyer_liked', coalesce(buyer_liked, false),
        'buyer_liked_at', buyer_liked_at
      ) order by paid_on desc, created_at desc)
      from payments where person_id = pid
    ), '[]'::jsonb),
    'reports', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', pr.id, 'payment_id', pr.payment_id, 'reason', pr.reason,
        'expected_amount', pr.expected_amount, 'details', pr.details,
        'status', pr.status, 'resolution_note', pr.resolution_note,
        'created_at', pr.created_at
      ) order by pr.created_at desc)
      from payment_reports pr where pr.person_id = pid
    ), '[]'::jsonb),
    'comments', case when me then coalesce((
      select jsonb_agg(jsonb_build_object('who', author_name, 'body', body, 'at', created_at) order by created_at)
      from comments where person_id = pid
    ), '[]'::jsonb) else '[]'::jsonb end
  );
  if r.show_table then
    res := res || jsonb_build_object('table', (
      select coalesce(jsonb_agg(to_jsonb(t) order by t.paid desc), '[]'::jsonb)
      from (
        select pe.id, pe.name, coalesce(sum(case when pa.voided then 0 else pa.amount end), 0) as paid
        from people pe left join payments pa on pa.person_id = pe.id
        where pe.record_id = r.id group by pe.id, pe.name
      ) t
    ));
  end if;
  return res;
end $$;

create or replace function rc_person_view(pid uuid) returns jsonb
language sql security definer set search_path = public as $$
  select get_person_view(pid);
$$;

drop function if exists rc_log_payment(uuid, numeric, date, timestamptz, text, text, text, text, text, uuid);
create or replace function rc_log_payment(
  pid uuid,
  amt numeric,
  p_paid_on date default current_date,
  p_paid_at timestamptz default null,
  p_method text default 'Cash',
  p_note text default null,
  p_payer_name text default null,
  p_payer_phone text default null,
  p_proof_path text default null,
  pay_id uuid default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare pe people; re records; pa payments; actor_nm text; entry jsonb; is_owner boolean; is_staff boolean;
begin
  if auth.uid() is null then raise exception 'Sign in required to record payments'; end if;
  if amt is null or amt <= 0 then raise exception 'Payment amount must be greater than zero'; end if;

  select * into pe from people where id = pid;
  if not found then raise exception 'Member not found'; end if;
  select * into re from records where id = pe.record_id;
  if not found then raise exception 'Group record not found'; end if;

  is_owner := (re.owner_id = auth.uid());
  is_staff := is_active_staff(re.owner_id);
  if not is_owner and not is_staff then
    raise exception 'Not authorized to record payments for this group';
  end if;

  select coalesce(nullif(trim(display_name), ''), case when is_owner then 'Admin' else 'Staff Helper' end)
  into actor_nm from rc_profiles where id = auth.uid();
  actor_nm := coalesce(actor_nm, case when is_owner then 'Admin' else 'Staff Helper' end);

  if pay_id is not null then
    select * into pa from payments where id = pay_id;
    if found then
      if pa.person_id <> pid then raise exception 'Payment ID belongs to another member'; end if;
      return to_jsonb(pa);
    end if;
  end if;

  entry := jsonb_build_object(
    'at', now(),
    'by', auth.uid(),
    'by_name', actor_nm,
    'action', 'created',
    'next', jsonb_build_object(
      'amount', amt,
      'paid_on', coalesce(p_paid_on, current_date),
      'method', left(coalesce(nullif(trim(p_method), ''), 'Cash'), 40)
    )
  );

  insert into payments(
    id, person_id, amount, paid_on, paid_at, method, note, payer_name, payer_phone, logged_by, proof_path, change_log
  ) values (
    coalesce(pay_id, gen_random_uuid()),
    pid,
    amt,
    coalesce(p_paid_on, current_date),
    coalesce(p_paid_at, now()),
    left(coalesce(nullif(trim(p_method), ''), 'Cash'), 40),
    left(nullif(trim(coalesce(p_note, '')), ''), 240),
    left(nullif(trim(coalesce(p_payer_name, '')), ''), 80),
    left(nullif(trim(coalesce(p_payer_phone, '')), ''), 40),
    auth.uid(),
    nullif(trim(coalesce(p_proof_path, '')), ''),
    jsonb_build_array(entry)
  )
  returning * into pa;

  insert into payment_audit_logs(payment_id, person_id, record_id, actor_id, actor_name, action, reason, new_data)
  values (pa.id, pe.id, re.id, auth.uid(), actor_nm, 'created', 'Recorded via server', entry->'next');

  if pe.user_id is not null and pe.user_id <> auth.uid() then
    insert into notifications(user_id, kind, title, body, link)
    values (
      pe.user_id,
      'payment_logged',
      'Payment recorded: ' || amt::text,
      re.title || ' · ' || to_char(pa.paid_on, 'YYYY-MM-DD'),
      '#/p/' || pe.id
    );
  end if;

  return to_jsonb(pa);
end $$;

drop function if exists rc_edit_payment(uuid, numeric, date, text, text, text);
drop function if exists rc_edit_payment(uuid, numeric, date, text, text, text, text);
create or replace function rc_edit_payment(
  pay_id uuid,
  new_amount numeric,
  new_paid_on date,
  new_method text,
  new_note text,
  reason_txt text,
  new_proof_path text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare pa payments; pe people; re records; actor_nm text; entry jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if coalesce(trim(reason_txt), '') = '' then raise exception 'A reason is required to edit a payment'; end if;
  if new_amount is null or new_amount <= 0 then raise exception 'Amount must be greater than zero'; end if;

  select * into pa from payments where id = pay_id;
  if not found then raise exception 'Payment not found'; end if;
  if pa.voided then raise exception 'Voided payments cannot be edited'; end if;
  select * into pe from people where id = pa.person_id;
  select * into re from records where id = pe.record_id;
  if re.owner_id <> auth.uid() then raise exception 'Only the record owner can edit payments'; end if;

  select coalesce(display_name, 'Admin') into actor_nm from rc_profiles where id = auth.uid();
  entry := jsonb_build_object(
    'at', now(),
    'by', auth.uid(),
    'by_name', coalesce(actor_nm, 'Admin'),
    'action', 'edited',
    'reason', left(trim(reason_txt), 240),
    'prev', jsonb_build_object('amount', pa.amount, 'paid_on', pa.paid_on, 'method', pa.method, 'note', pa.note),
    'next', jsonb_build_object('amount', new_amount, 'paid_on', coalesce(new_paid_on, pa.paid_on), 'method', new_method, 'note', new_note)
  );

  update payments set
    amount = new_amount,
    paid_on = coalesce(new_paid_on, paid_on),
    method = new_method,
    note = new_note,
    proof_path = coalesce(nullif(trim(coalesce(new_proof_path, '')), ''), proof_path),
    edited_at = now(),
    edit_reason = left(trim(reason_txt), 240),
    change_log = coalesce(change_log, '[]'::jsonb) || entry
  where id = pay_id
  returning * into pa;

  insert into payment_audit_logs(payment_id, person_id, record_id, actor_id, actor_name, action, reason, previous_data, new_data)
  values (pa.id, pe.id, re.id, auth.uid(), coalesce(actor_nm, 'Admin'), 'edited', left(trim(reason_txt), 240), entry->'prev', entry->'next');

  return to_jsonb(pa);
end $$;

create or replace function rc_void_payment(pay_id uuid, reason_txt text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare pa payments; pe people; re records; actor_nm text; entry jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if coalesce(trim(reason_txt), '') = '' then raise exception 'A reason is required to void a payment'; end if;

  select * into pa from payments where id = pay_id;
  if not found then raise exception 'Payment not found'; end if;
  if pa.voided then raise exception 'This payment is already voided'; end if;
  select * into pe from people where id = pa.person_id;
  select * into re from records where id = pe.record_id;
  if re.owner_id <> auth.uid() then raise exception 'Only the record owner can void payments'; end if;

  select coalesce(display_name, 'Admin') into actor_nm from rc_profiles where id = auth.uid();
  entry := jsonb_build_object(
    'at', now(),
    'by', auth.uid(),
    'by_name', coalesce(actor_nm, 'Admin'),
    'action', 'voided',
    'reason', left(trim(reason_txt), 240),
    'prev', jsonb_build_object('amount', pa.amount, 'paid_on', pa.paid_on, 'voided', pa.voided),
    'next', jsonb_build_object('voided', true)
  );

  update payments set
    voided = true,
    voided_at = now(),
    void_reason = left(trim(reason_txt), 240),
    change_log = coalesce(change_log, '[]'::jsonb) || entry
  where id = pay_id
  returning * into pa;

  insert into payment_audit_logs(payment_id, person_id, record_id, actor_id, actor_name, action, reason, previous_data, new_data)
  values (pa.id, pe.id, re.id, auth.uid(), coalesce(actor_nm, 'Admin'), 'voided', left(trim(reason_txt), 240), entry->'prev', entry->'next');

  return to_jsonb(pa);
end $$;

drop function if exists rc_react_payment(uuid, uuid, boolean);
create or replace function rc_react_payment(pid uuid, pay_id uuid, liked_in boolean default true) returns jsonb
language plpgsql security definer set search_path = public as $$
declare pe people; re records; pa payments; was_liked boolean; want_like boolean;
begin
  select * into pe from people where id = pid;
  if not found then raise exception 'Member not found'; end if;
  select * into re from records where id = pe.record_id;
  select * into pa from payments where id = pay_id and person_id = pid;
  if not found then raise exception 'Payment not found'; end if;
  if pa.voided then raise exception 'Voided payments cannot be liked'; end if;

  if pe.user_id is not null and (auth.uid() is null or pe.user_id <> auth.uid()) then
    raise exception 'Please sign in as this member to respond to this payment';
  end if;

  was_liked := coalesce(pa.buyer_liked, false);
  want_like := coalesce(liked_in, true);

  update payments set
    buyer_liked = want_like,
    buyer_liked_at = case when want_like then now() else null end
  where id = pay_id
  returning * into pa;

  if want_like and not was_liked then
    insert into notifications(user_id, kind, title, body, link)
    values (
      re.owner_id,
      'payment_liked',
      pe.name || ' liked a payment',
      'Confirmed ' || pa.amount::text || ' in ' || re.title,
      '#/r/' || re.id || '/' || pe.id
    );
  end if;

  return jsonb_build_object('id', pa.id, 'buyer_liked', pa.buyer_liked, 'buyer_liked_at', pa.buyer_liked_at);
end $$;

create or replace function rc_report_payment(
  pid uuid,
  pay_id uuid,
  reason_txt text,
  expected_amt numeric default null,
  details_txt text default null,
  reporter_nm text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare pe people; re records; pa payments; row_out payment_reports;
begin
  if coalesce(trim(reason_txt), '') = '' then raise exception 'Please select a reason'; end if;
  select * into pe from people where id = pid;
  if not found then raise exception 'Person not found'; end if;
  select * into re from records where id = pe.record_id;
  select * into pa from payments where id = pay_id and person_id = pid;
  if not found then raise exception 'Payment not found'; end if;

  insert into payment_reports(payment_id, person_id, record_id, owner_id, reporter_id, reporter_name, reason, expected_amount, details)
  values (
    pay_id, pid, re.id, re.owner_id, auth.uid(),
    left(coalesce(nullif(trim(reporter_nm), ''), pe.name, 'Buyer'), 80),
    left(trim(reason_txt), 120),
    expected_amt,
    left(nullif(trim(coalesce(details_txt, '')), ''), 500)
  )
  returning * into row_out;

  insert into notifications(user_id, kind, title, body, link)
  values (
    re.owner_id,
    'payment_reported',
    'Problem reported by ' || pe.name,
    left(trim(reason_txt), 80) || ' on ' || re.title,
    '#/r/' || re.id || '/' || pe.id
  );

  return to_jsonb(row_out);
end $$;

create or replace function rc_resolve_payment_report(report_id uuid, note_txt text default null) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return false; end if;
  update payment_reports
  set status = 'resolved', resolution_note = left(nullif(trim(coalesce(note_txt, '')), ''), 240), resolved_at = now()
  where id = report_id and owner_id = auth.uid();
  return found;
end $$;

drop function if exists get_group_people(uuid);
create or replace function get_group_people(rid uuid) returns jsonb
language sql security definer set search_path = public as $$
  select case when r.group_link then jsonb_build_object(
    'title', r.title,
    'description', r.description,
    'people', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name) order by p.name), '[]'::jsonb)
               from people p where p.record_id = r.id)
  ) end
  from records r where r.id = rid;
$$;

drop function if exists claim_person(uuid);
create or replace function claim_person(pid uuid) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return false; end if;
  update people set user_id = auth.uid() where id = pid and user_id is null;
  return found;
end $$;

drop function if exists add_comment(uuid, text, text);
create or replace function add_comment(pid uuid, msg text, who text) returns void
language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  select exists (
    select 1 from people p join records r on r.id = p.record_id
    where p.id = pid and (p.user_id = auth.uid() or r.owner_id = auth.uid() or is_active_staff(r.owner_id))
  ) into ok;
  if auth.uid() is null or not ok or coalesce(trim(msg), '') = '' then raise exception 'Not allowed'; end if;
  insert into comments(person_id, author_id, author_name, body) values (pid, auth.uid(), left(who, 60), left(msg, 500));
end $$;

drop function if exists get_group_messages(uuid);
create or replace function get_group_messages(rid uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  if auth.uid() is null then return null; end if;
  select (
    exists (select 1 from records r where r.id = rid and (r.owner_id = auth.uid() or is_active_staff(r.owner_id)))
    or exists (select 1 from people p where p.record_id = rid and p.user_id = auth.uid())
  ) into ok;
  if not ok then return null; end if;
  return coalesce((
    select jsonb_agg(m order by m.created_at asc) from (
      select id, record_id, author_id, author_name, body, created_at
      from group_messages
      where record_id = rid
      order by created_at desc
      limit 100
    ) m
  ), '[]'::jsonb);
end $$;

drop function if exists send_group_message(uuid, text, text, uuid);
create or replace function send_group_message(rid uuid, msg text, who text, msg_id uuid default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare ok boolean; clean text; nm text; row_out group_messages;
begin
  clean := left(trim(coalesce(msg, '')), 500);
  if auth.uid() is null or clean = '' then raise exception 'Not allowed'; end if;
  select (
    exists (select 1 from records r where r.id = rid and (r.owner_id = auth.uid() or is_active_staff(r.owner_id)))
    or exists (select 1 from people p where p.record_id = rid and p.user_id = auth.uid())
  ) into ok;
  if not ok then raise exception 'Not allowed'; end if;
  nm := left(coalesce(nullif(trim(who), ''), 'Member'), 60);
  insert into group_messages(id, record_id, author_id, author_name, body)
  values (coalesce(msg_id, gen_random_uuid()), rid, auth.uid(), nm, clean)
  on conflict (id) do nothing
  returning * into row_out;
  if not found and msg_id is not null then
    select * into row_out from group_messages where id = msg_id and author_id = auth.uid();
  end if;
  return to_jsonb(row_out);
end $$;

-- Search with "Hide me from search" and block filtering
drop function if exists rc_search(text);
create or replace function rc_search(q text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare pat text;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  pat := '%' || coalesce(trim(q), '') || '%';
  if char_length(trim(coalesce(q, ''))) < 2 then
    return jsonb_build_object('groups', '[]'::jsonb, 'people', '[]'::jsonb);
  end if;
  return jsonb_build_object(
    'groups', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id,
        'title', r.title,
        'description', r.description,
        'owner_id', r.owner_id,
        'owner_name', coalesce(pr.display_name, 'Recordly user'),
        'member_count', (select count(*) from people pe where pe.record_id = r.id)
      ) order by r.created_at desc)
      from records r
      left join rc_profiles pr on pr.id = r.owner_id
      where r.discoverable = true
        and (r.title ilike pat or coalesce(r.description, '') ilike pat)
        and not exists (
          select 1 from user_blocks b
          where b.blocker_id = auth.uid()
            and (b.blocked_record_id = r.id or b.blocked_user_id = r.owner_id)
        )
      limit 30
    ), '[]'::jsonb),
    'people', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', pr.id,
        'display_name', pr.display_name
      ) order by pr.display_name)
      from rc_profiles pr
      where coalesce(pr.searchable, true) = true
        and pr.id <> auth.uid()
        and pr.display_name ilike pat
        and not exists (
          select 1 from user_blocks b
          where b.blocker_id = auth.uid() and b.blocked_user_id = pr.id
        )
      limit 25
    ), '[]'::jsonb)
  );
end $$;

create or replace function rc_block_entity(target_uid uuid default null, target_rid uuid default null, lbl text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare row_out user_blocks;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if target_uid is null and target_rid is null then raise exception 'Target required'; end if;
  insert into user_blocks(blocker_id, blocked_user_id, blocked_record_id, label)
  values (auth.uid(), target_uid, target_rid, left(nullif(trim(coalesce(lbl, '')), ''), 120))
  returning * into row_out;
  return to_jsonb(row_out);
end $$;

create or replace function rc_unblock_entity(blk_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return false; end if;
  delete from user_blocks where id = blk_id and blocker_id = auth.uid();
  return found;
end $$;

create or replace function rc_submit_abuse_report(rid uuid default null, target_uid uuid default null, reason_txt text default 'Other', details_txt text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare row_out abuse_reports;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  insert into abuse_reports(reporter_id, record_id, target_user_id, reason, details)
  values (auth.uid(), rid, target_uid, left(coalesce(nullif(trim(reason_txt), ''), 'Other'), 120), left(nullif(trim(coalesce(details_txt, '')), ''), 500))
  returning * into row_out;
  return to_jsonb(row_out);
end $$;

drop function if exists rc_group_card(uuid);
create or replace function rc_group_card(rid uuid) returns jsonb
language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'id', r.id,
    'title', r.title,
    'description', r.description,
    'owner_id', r.owner_id,
    'owner_name', coalesce(pr.display_name, 'a Recordly user'),
    'member_count', (select count(*) from people p where p.record_id = r.id)
  )
  from records r
  left join rc_profiles pr on pr.id = r.owner_id
  where r.id = rid;
$$;

drop function if exists rc_request_join(uuid, text, text);
create or replace function rc_request_join(rid uuid, req_name text, req_phone text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r records; row_out join_requests;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select * into r from records where id = rid;
  if not found then raise exception 'Group not found'; end if;
  insert into join_requests(record_id, owner_id, requester_id, requester_name, requester_phone)
  values (rid, r.owner_id, auth.uid(), left(trim(req_name), 80), left(nullif(trim(coalesce(req_phone, '')), ''), 40))
  returning * into row_out;
  return to_jsonb(row_out);
end $$;

drop function if exists rc_resolve_join(uuid, boolean, uuid);
create or replace function rc_resolve_join(req uuid, approve boolean, person uuid default null) returns boolean
language plpgsql security definer set search_path = public as $$
declare jr join_requests;
begin
  if auth.uid() is null then return false; end if;
  select * into jr from join_requests where id = req and owner_id = auth.uid();
  if not found then return false; end if;
  update join_requests
  set status = case when approve then 'approved' else 'rejected' end,
      person_id = case when approve then person else null end,
      retry_after = case when approve then null else now() + interval '24 hours' end
  where id = req;
  if approve and person is not null then
    update people set user_id = jr.requester_id where id = person and record_id = jr.record_id and user_id is null;
  end if;
  return true;
end $$;

drop function if exists rc_my_groups();
create or replace function rc_my_groups() returns jsonb
language sql security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'record_id', r.id,
    'person_id', p.id,
    'title', r.title,
    'target', r.target,
    'end_date', r.end_date,
    'due_date', p.due_date,
    'installment_plan', p.installment_plan,
    'group_link', r.group_link,
    'hide_balance', r.hide_balance,
    'owner_name', coalesce(pr.display_name, 'Group admin'),
    'paid', (select coalesce(sum(case when pa.voided then 0 else pa.amount end), 0) from payments pa where pa.person_id = p.id)
  ) order by p.created_at desc), '[]'::jsonb)
  from people p
  join records r on r.id = p.record_id
  left join rc_profiles pr on pr.id = r.owner_id
  where p.user_id = auth.uid();
$$;

drop function if exists rc_log_visit(uuid, uuid, text);
create or replace function rc_log_visit(rid uuid default null, pid uuid default null, src text default 'link') returns void
language plpgsql security definer set search_path = public as $$
declare own uuid; nm text;
begin
  if pid is not null then
    select r.owner_id into own from people p join records r on r.id = p.record_id where p.id = pid;
  elsif rid is not null then
    select r.owner_id into own from records r where r.id = rid;
  end if;
  if own is null or (auth.uid() is not null and own = auth.uid()) then return; end if;
  if auth.uid() is not null then select display_name into nm from rc_profiles where id = auth.uid(); end if;
  insert into visits(owner_id, record_id, person_id, source, visitor_name)
  values (own, rid, pid, left(coalesce(src, 'link'), 24), nm);
end $$;

-- Plans & usage RPCs
create or replace function rc_get_my_plan_usage() returns jsonb
language plpgsql security definer set search_path = public as $$
declare lim record; rec_cnt int; max_mem int; staff_cnt int;
begin
  if auth.uid() is null then return null; end if;
  select * into lim from get_owner_plan_limits(auth.uid());
  select count(*) into rec_cnt from records where owner_id = auth.uid();
  select coalesce(max(c), 0) into max_mem from (
    select count(*) as c from people p join records r on r.id = p.record_id where r.owner_id = auth.uid() group by r.id
  ) t;
  select count(*) into staff_cnt from team_members where owner_id = auth.uid() and status in ('pending', 'active');
  return jsonb_build_object(
    'plan', lim.plan,
    'limits', jsonb_build_object('max_records', lim.max_records, 'max_members_per_record', lim.max_members_per_record, 'max_staff', lim.max_staff),
    'usage', jsonb_build_object('records', rec_cnt, 'max_group_members', max_mem, 'staff', staff_cnt)
  );
end $$;

create or replace function rc_set_plan(new_plan text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare mr int; mm int; ms int; clean text;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  clean := lower(trim(coalesce(new_plan, 'free')));
  if clean not in ('free', 'pro', 'business') then raise exception 'Invalid plan'; end if;
  if clean = 'free' then mr := 3; mm := 25; ms := 0;
  elsif clean = 'pro' then mr := 25; mm := 200; ms := 3;
  else mr := -1; mm := -1; ms := 15;
  end if;
  insert into user_plans(user_id, plan, max_records, max_members_per_record, max_staff, updated_at)
  values (auth.uid(), clean, mr, mm, ms, now())
  on conflict (user_id) do update set
    plan = excluded.plan,
    max_records = excluded.max_records,
    max_members_per_record = excluded.max_members_per_record,
    max_staff = excluded.max_staff,
    updated_at = now();
  return rc_get_my_plan_usage();
end $$;

-- Team / Staff RPCs
drop function if exists rc_invite_staff(text, text);
drop function if exists rc_invite_staff(text, text, text);
create or replace function rc_invite_staff(email_in text default null, name_in text default null, phone_in text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  clean_email text;
  clean_phone text;
  clean_name text;
  existing_id uuid;
  row_out team_members;
  lim record;
  cur_cnt int;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  clean_email := nullif(lower(trim(coalesce(email_in, ''))), '');
  clean_phone := nullif(normalize_phone(phone_in), '');
  clean_name := left(nullif(trim(coalesce(name_in, '')), ''), 80);

  if clean_email is not null and position('@' in clean_email) = 0 then
    raise exception 'Enter a valid email address';
  end if;
  if clean_phone is not null and char_length(regexp_replace(clean_phone, '[^0-9]', '', 'g')) < 8 then
    raise exception 'Enter a valid helper phone number';
  end if;
  if clean_email is null and clean_phone is null then
    raise exception 'Enter a helper email address or phone number';
  end if;

  select id into existing_id from team_members
  where owner_id = auth.uid()
    and (
      (clean_email is not null and lower(staff_email) = clean_email)
      or (clean_phone is not null and staff_phone = clean_phone)
    )
  order by created_at desc
  limit 1;

  if existing_id is not null then
    select * into row_out from team_members where id = existing_id;
    if row_out.status = 'revoked' then
      select * into lim from get_owner_plan_limits(auth.uid());
      if lim.max_staff = 0 then
        raise exception 'PLAN_LIMIT_STAFF: Staff helper accounts require a Pro or Business plan.';
      end if;
      select count(*) into cur_cnt from team_members where owner_id = auth.uid() and status in ('pending', 'active');
      if lim.max_staff > 0 and cur_cnt >= lim.max_staff then
        raise exception 'PLAN_LIMIT_STAFF: Your % plan allows up to % staff accounts.', lim.plan, lim.max_staff;
      end if;
    end if;
    update team_members set
      staff_email = coalesce(clean_email, staff_email),
      staff_phone = coalesce(clean_phone, staff_phone),
      staff_name = coalesce(clean_name, staff_name),
      status = case when status = 'revoked' then 'pending' else status end
    where id = existing_id
    returning * into row_out;
  else
    insert into team_members(owner_id, staff_email, staff_phone, staff_name, status)
    values (auth.uid(), clean_email, clean_phone, clean_name, 'pending')
    returning * into row_out;
  end if;
  return to_jsonb(row_out);
end $$;

create or replace function rc_accept_staff_invite(code_or_id text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare row_out team_members; my_email text; my_phone text;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select lower(coalesce(email, '')), normalize_phone(coalesce(phone, ''))
  into my_email, my_phone
  from auth.users where id = auth.uid();

  update team_members
  set staff_user_id = auth.uid(),
      status = 'active',
      staff_name = coalesce(staff_name, (select display_name from rc_profiles where id = auth.uid()))
  where (invite_code = code_or_id or id::text = code_or_id)
    and status in ('pending', 'active')
    and (staff_user_id is null or staff_user_id = auth.uid())
    and (
      (staff_email is not null and my_email <> '' and lower(staff_email) = my_email)
      or (staff_phone is not null and my_phone <> '' and normalize_phone(staff_phone) = my_phone)
    )
  returning * into row_out;
  if not found then raise exception 'Invite not found or belongs to a different email address or phone number'; end if;
  return to_jsonb(row_out);
end $$;

create or replace function rc_revoke_staff(tm_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return false; end if;
  update team_members set status = 'revoked' where id = tm_id and owner_id = auth.uid();
  return found;
end $$;

create or replace function rc_get_staff_workspaces() returns jsonb
language sql security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'owner_id', tm.owner_id,
    'owner_name', coalesce(pr.display_name, 'Business Owner'),
    'permissions', tm.permissions,
    'records', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id, 'owner_id', r.owner_id, 'title', r.title, 'description', r.description,
        'target', r.target, 'end_date', r.end_date, 'freq', r.freq, 'start_date', r.start_date,
        'period_amount', r.period_amount, 'show_table', r.show_table, 'group_link', r.group_link,
        'hide_balance', r.hide_balance, 'discoverable', r.discoverable, 'created_at', r.created_at,
        'people', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', p.id, 'name', p.name, 'phone', p.phone, 'email', p.email,
            'due_date', p.due_date, 'installment_plan', p.installment_plan,
            'payments', coalesce((
              select jsonb_agg(to_jsonb(pa) order by pa.paid_on desc)
              from payments pa where pa.person_id = p.id
            ), '[]'::jsonb)
          ) order by p.name)
          from people p where p.record_id = r.id
        ), '[]'::jsonb)
      ) order by r.created_at desc)
      from records r where r.owner_id = tm.owner_id
    ), '[]'::jsonb)
  )), '[]'::jsonb)
  from team_members tm
  left join rc_profiles pr on pr.id = tm.owner_id
  where tm.staff_user_id = auth.uid() and tm.status = 'active';
$$;

drop function if exists delete_my_account();
create or replace function delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  delete from auth.users where id = auth.uid();
end $$;

grant execute on function get_person_view(uuid), rc_person_view(uuid), get_group_people(uuid), rc_group_card(uuid), rc_report_payment(uuid, uuid, text, numeric, text, text), rc_react_payment(uuid, uuid, boolean), rc_log_visit(uuid, uuid, text) to anon, authenticated;
grant execute on function
  claim_person(uuid), add_comment(uuid, text, text), get_group_messages(uuid), send_group_message(uuid, text, text, uuid),
  rc_log_payment(uuid, numeric, date, timestamptz, text, text, text, text, text, uuid),
  rc_edit_payment(uuid, numeric, date, text, text, text, text), rc_void_payment(uuid, text), rc_resolve_payment_report(uuid, text),
  rc_search(text), rc_block_entity(uuid, uuid, text), rc_unblock_entity(uuid), rc_submit_abuse_report(uuid, uuid, text, text),
  rc_request_join(uuid, text, text), rc_resolve_join(uuid, boolean, uuid), rc_my_groups(),
  rc_get_my_plan_usage(), rc_set_plan(text), rc_invite_staff(text, text, text), rc_accept_staff_invite(text), rc_revoke_staff(uuid), rc_get_staff_workspaces(),
  delete_my_account()
to authenticated;

do $$ begin alter publication supabase_realtime add table payments; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table group_messages; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table notifications; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table payment_reports; exception when duplicate_object then null; end $$;
