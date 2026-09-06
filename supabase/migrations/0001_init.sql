-- DawaMudir — V1 schema (PRD §4)
-- Run via: supabase db push  (or paste into the SQL editor)

create extension if not exists pgcrypto;

-- ============================================================
-- Lookups
-- ============================================================

create table governorates (
  id      serial primary key,
  name_ar text not null,
  name_en text
);

create table districts (
  id              serial primary key,
  governorate_id  int not null references governorates(id) on delete cascade,
  name_ar         text not null
);

create index districts_governorate_id_idx on districts(governorate_id);

-- ============================================================
-- Accounts
-- ============================================================

create table profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  full_name          text not null,
  phone              text not null unique,
  governorate_id     int references governorates(id),
  district_id        int references districts(id),
  is_pharmacist      boolean not null default false,
  is_owner           boolean not null default false,
  verification_tier  text not null default 'basic' check (verification_tier in ('basic', 'documents')),
  avatar_url         text,
  is_admin           boolean not null default false,
  is_banned          boolean not null default false,
  created_at         timestamptz not null default now()
);

create index profiles_governorate_id_idx on profiles(governorate_id);

-- Pharmacist-specific fields (1:1 with profiles, only present when is_pharmacist)
create table pharmacist_details (
  profile_id              uuid primary key references profiles(id) on delete cascade,
  license_number          text unique,               -- رقم مزاولة المهنة، بعد الموافقة
  graduation_year         int,
  takleef_status          text check (takleef_status in ('not_started', 'upcoming', 'completed', 'exempted')),
  is_available            boolean not null default true,
  open_to_durations       text[] not null default '{}',   -- permanent | temporary
  open_to_attendance      text[] not null default '{}',   -- with | without
  accepts_schedule        boolean,
  accepts_imported        boolean,
  expected_salary_min     int,
  expected_salary_max     int,
  preferred_governorates  int[] not null default '{}',
  bio                     text
);

-- Pharmacies (an owner can list more than one)
create table pharmacies (
  id                uuid primary key default gen_random_uuid(),
  owner_profile_id  uuid not null references profiles(id) on delete cascade,
  name              text not null,
  license_number    text,
  governorate_id    int references governorates(id),
  district_id       int references districts(id),
  address_text      text,
  has_schedule      boolean,
  sells_imported    boolean,
  clean_record      boolean,
  created_at        timestamptz not null default now()
);

create index pharmacies_owner_profile_id_idx on pharmacies(owner_profile_id);
create index pharmacies_governorate_id_idx on pharmacies(governorate_id);

-- ============================================================
-- Listings (both directions live in one table)
-- ============================================================

create table listings (
  id              uuid primary key default gen_random_uuid(),
  kind            text not null check (kind in ('manager_wanted', 'manager_available')),
  author_id       uuid not null references profiles(id) on delete cascade,
  pharmacy_id     uuid references pharmacies(id) on delete cascade,   -- manager_wanted only
  duration_type   text check (duration_type in ('permanent', 'temporary')),
  duration_months int,
  attendance      text check (attendance in ('with', 'without')),
  schedule        text check (schedule in ('with', 'without')),
  imported        text check (imported in ('with', 'without')),
  governorate_id  int references governorates(id),
  district_id     int references districts(id),
  salary_amount   int,
  notes           text,
  status          text not null default 'active' check (status in ('active', 'paused', 'closed')),
  expires_at      timestamptz,
  created_at      timestamptz not null default now()
);

create index listings_governorate_id_idx on listings(governorate_id);
create index listings_kind_status_idx on listings(kind, status);
create index listings_author_id_idx on listings(author_id);

-- Anti-fraud: cap active listings per account — 1 for basic tier, 3 for documents tier (PRD §3)
create or replace function enforce_active_listing_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tier  text;
  v_cap   int;
  v_count int;
begin
  if new.status <> 'active' then
    return new;
  end if;

  select verification_tier into v_tier from profiles where id = new.author_id;
  v_cap := case when v_tier = 'documents' then 3 else 1 end;

  select count(*) into v_count
  from listings
  where author_id = new.author_id
    and status = 'active'
    and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

  if v_count >= v_cap then
    raise exception 'active listing cap reached (% of %)', v_count, v_cap;
  end if;

  return new;
end;
$$;

create trigger listings_enforce_cap
  before insert or update of status on listings
  for each row execute function enforce_active_listing_cap();

-- ============================================================
-- Verification
-- ============================================================

create table verification_documents (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid references profiles(id) on delete cascade,
  pharmacy_id   uuid references pharmacies(id) on delete cascade,
  doc_type      text not null check (doc_type in ('license', 'national_id', 'pharmacy_license')),
  storage_path  text not null,
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_note   text,
  reviewed_by   uuid references profiles(id),
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now()
);

create index verification_documents_profile_id_idx on verification_documents(profile_id);
create index verification_documents_status_idx on verification_documents(status);

-- ============================================================
-- Chat
-- ============================================================

create table conversations (
  id               uuid primary key default gen_random_uuid(),
  listing_id       uuid references listings(id) on delete cascade,
  participant_a    uuid not null references profiles(id) on delete cascade,
  participant_b    uuid not null references profiles(id) on delete cascade,
  last_message_at  timestamptz,
  created_at       timestamptz not null default now(),
  unique (listing_id, participant_a, participant_b)
);

create table messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references conversations(id) on delete cascade,
  sender_id        uuid not null references profiles(id) on delete cascade,
  body             text not null,
  contains_phone   boolean not null default false,   -- analytics only, never blocks sending (PRD §6)
  created_at       timestamptz not null default now(),
  read_at          timestamptz
);

create index messages_conversation_id_idx on messages(conversation_id);

-- ============================================================
-- Deals, reviews, reports
-- ============================================================

-- Kept in the schema from day one even though V1 has no payment/escrow — this is the same
-- object that becomes the escrow record in V2, and it's the only source of real salary data
-- and the gate for reviews (PRD §4 "ليه جدول deals في V1"). Its confirmation UI may ship in
-- v1.1 if M2/M3 timeline slips; the table itself does not move.
create table deals (
  id                       uuid primary key default gen_random_uuid(),
  conversation_id          uuid references conversations(id) on delete set null,
  listing_id               uuid references listings(id) on delete set null,
  owner_id                 uuid not null references profiles(id) on delete cascade,
  pharmacist_id            uuid not null references profiles(id) on delete cascade,
  agreed_salary            int,
  duration_type            text check (duration_type in ('permanent', 'temporary')),
  duration_months          int,
  start_date               date,
  confirmed_by_owner       boolean not null default false,
  confirmed_by_pharmacist  boolean not null default false,
  status                   text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
  created_at               timestamptz not null default now()
);

create index deals_owner_id_idx on deals(owner_id);
create index deals_pharmacist_id_idx on deals(pharmacist_id);

create table reviews (
  id          uuid primary key default gen_random_uuid(),
  deal_id     uuid not null references deals(id) on delete cascade,
  author_id   uuid not null references profiles(id) on delete cascade,
  target_id   uuid not null references profiles(id) on delete cascade,
  rating      int not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now(),
  unique (deal_id, author_id)
);

create index reviews_target_id_idx on reviews(target_id);

create table reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid not null references profiles(id) on delete cascade,
  target_type  text not null check (target_type in ('profile', 'listing', 'message', 'pharmacy')),
  target_id    uuid not null,
  reason       text not null,
  status       text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at   timestamptz not null default now()
);

-- Anti-fraud: automatic flag queue for the admin (e.g. a phone number reused across listings/
-- profiles — PRD §3 "رصد إعادة استخدام الرقم"). App/edge-function logic writes here; nothing
-- auto-inserts from SQL alone.
create table fraud_flags (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null,          -- e.g. 'phone_reuse_in_listing_text'
  target_type  text not null check (target_type in ('profile', 'listing', 'message')),
  target_id    uuid not null,
  detail       jsonb,
  status       text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at   timestamptz not null default now()
);

-- ============================================================
-- RLS
-- ============================================================

alter table profiles enable row level security;
alter table pharmacist_details enable row level security;
alter table pharmacies enable row level security;
alter table listings enable row level security;
alter table verification_documents enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table deals enable row level security;
alter table reviews enable row level security;
alter table reports enable row level security;
alter table fraud_flags enable row level security;

-- Admin check as SECURITY DEFINER so it doesn't recurse into profiles' own RLS.
create or replace function is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select p.is_admin from profiles p where p.id = uid), false);
$$;

-- governorates / districts: public lookup data, no RLS needed for reads; block writes from the API.
alter table governorates enable row level security;
alter table districts enable row level security;
create policy governorates_select_all on governorates for select using (true);
create policy districts_select_all on districts for select using (true);

-- profiles: only the owner (full row, including phone) or an admin can read the base table.
-- Public/anon browsing goes through the public_profiles view below, which never exposes phone.
create policy profiles_select_own_or_admin on profiles
  for select using (auth.uid() = id or is_admin(auth.uid()));
create policy profiles_update_own on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id and is_admin = false and is_banned = false);
create policy profiles_insert_own on profiles
  for insert with check (auth.uid() = id);

-- Safe public view — no `phone`, no `is_admin`/`is_banned` internals. Deliberately created
-- without security_invoker so it can show rows across users despite the owner-only RLS policy
-- above (Supabase's linter will flag this as a "Security Definer View"; that's expected here).
create view public_profiles as
  select id, full_name, governorate_id, district_id, is_pharmacist, is_owner,
         verification_tier, avatar_url, created_at
  from profiles
  where is_banned = false;

grant select on public_profiles to anon, authenticated;

create policy pharmacist_details_select_own_or_admin on pharmacist_details
  for select using (auth.uid() = profile_id or is_admin(auth.uid()));
create policy pharmacist_details_write_own on pharmacist_details
  for insert with check (auth.uid() = profile_id);
create policy pharmacist_details_update_own on pharmacist_details
  for update using (auth.uid() = profile_id);

-- pharmacies: browsable by anyone (governorate/name/flags are not sensitive). Detailed
-- address masking until a chat starts (PRD §4 RLS notes) is a UI-layer concern for V1, not RLS.
create policy pharmacies_select_all on pharmacies for select using (true);
create policy pharmacies_write_own on pharmacies
  for insert with check (auth.uid() = owner_profile_id);
create policy pharmacies_update_own on pharmacies
  for update using (auth.uid() = owner_profile_id);
create policy pharmacies_delete_own on pharmacies
  for delete using (auth.uid() = owner_profile_id);

-- listings: active listings are public; authors see/manage all their own regardless of status.
create policy listings_select_active_or_own on listings
  for select using (status = 'active' or auth.uid() = author_id or is_admin(auth.uid()));
create policy listings_write_own on listings
  for insert with check (auth.uid() = author_id);
create policy listings_update_own on listings
  for update using (auth.uid() = author_id or is_admin(auth.uid()));
create policy listings_delete_own on listings
  for delete using (auth.uid() = author_id);

-- verification_documents: strictly the owner and admins. National ID never leaves this table.
create policy verification_documents_select_own_or_admin on verification_documents
  for select using (auth.uid() = profile_id or is_admin(auth.uid()));
create policy verification_documents_insert_own on verification_documents
  for insert with check (auth.uid() = profile_id);
create policy verification_documents_admin_update on verification_documents
  for update using (is_admin(auth.uid()));

-- conversations / messages: participants only.
create policy conversations_select_participant on conversations
  for select using (auth.uid() = participant_a or auth.uid() = participant_b);
create policy conversations_insert_participant on conversations
  for insert with check (auth.uid() = participant_a or auth.uid() = participant_b);

create policy messages_select_participant on messages
  for select using (
    exists (
      select 1 from conversations c
      where c.id = conversation_id
        and (c.participant_a = auth.uid() or c.participant_b = auth.uid())
    )
  );
create policy messages_insert_participant on messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from conversations c
      where c.id = conversation_id
        and (c.participant_a = auth.uid() or c.participant_b = auth.uid())
    )
  );

-- deals: the two parties only; admins read for aggregate reporting.
create policy deals_select_participant_or_admin on deals
  for select using (auth.uid() = owner_id or auth.uid() = pharmacist_id or is_admin(auth.uid()));
create policy deals_insert_participant on deals
  for insert with check (auth.uid() = owner_id or auth.uid() = pharmacist_id);
create policy deals_update_participant on deals
  for update using (auth.uid() = owner_id or auth.uid() = pharmacist_id);

-- reviews: publicly readable (they inform trust); only insertable by a confirmed deal's participant.
create policy reviews_select_all on reviews for select using (true);
create policy reviews_insert_participant_of_confirmed_deal on reviews
  for insert with check (
    author_id = auth.uid()
    and exists (
      select 1 from deals d
      where d.id = deal_id
        and d.status = 'confirmed'
        and (d.owner_id = auth.uid() or d.pharmacist_id = auth.uid())
        and target_id = case when d.owner_id = auth.uid() then d.pharmacist_id else d.owner_id end
    )
  );

-- reports: any authenticated user can file one; only admins can read/triage.
create policy reports_insert_own on reports
  for insert with check (auth.uid() = reporter_id);
create policy reports_select_admin on reports
  for select using (is_admin(auth.uid()));
create policy reports_update_admin on reports
  for update using (is_admin(auth.uid()));

-- fraud_flags: admin-only, end to end.
create policy fraud_flags_admin_all on fraud_flags
  for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
