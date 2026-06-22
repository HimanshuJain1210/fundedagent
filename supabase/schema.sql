-- ============================================================
-- Weekly Funded-Companies Agent — Supabase schema
-- Run this entire file in Supabase SQL Editor.
-- Designed so a paid funding API can later write to the same tables.
-- ============================================================

-- ============ SOURCES (RSS feeds + future APIs) ============
create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null,
  source_type text not null default 'rss' check (source_type in ('rss','api')),
  geo text not null default 'global' check (geo in ('india','global')),
  active boolean default true,
  created_at timestamptz default now()
);

-- ============ COMPANIES ============
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text not null,
  website text,
  sector text,
  geo text check (geo in ('india','global')),
  careers_url text,
  ats_type text,
  linkedin_url text,
  created_at timestamptz default now(),
  unique (normalized_name)
);

-- ============ FUNDING ROUNDS ============
create table if not exists funding_rounds (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  round_type text,
  amount_usd numeric,
  amount_raw text,
  currency text,
  announced_date date,
  week_of date,
  investors text[],
  source_id uuid references sources(id),
  source_url text,
  raw_excerpt text,
  created_at timestamptz default now()
);

create unique index if not exists uniq_round_per_company_week
  on funding_rounds (company_id, week_of);

-- ============ ROLES (open jobs) ============
create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  title text not null,
  location text,
  url text,
  is_pm_relevant boolean default false,
  created_at timestamptz default now()
);

create unique index if not exists uniq_role_per_company_url
  on roles (company_id, url);

-- ============ OUTREACH CARDS (tailoring output) ============
create table if not exists outreach_cards (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  job_pitch text,
  partnership_angle text,
  contact_path text,
  generated_at timestamptz default now(),
  unique (company_id)
);

-- ============ INGESTION LOG (idempotency) ============
create table if not exists ingested_items (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references sources(id),
  item_guid text not null,
  processed_at timestamptz default now(),
  unique (source_id, item_guid)
);

-- ============ SEED FEEDS ============
insert into sources (name, url, geo) values
  ('Entrackr',    'https://entrackr.com/feed/',    'india'),
  ('Inc42',       'https://inc42.com/feed/',       'india'),
  ('YourStory',   'https://yourstory.com/feed',    'india'),
  ('TechCrunch',  'https://techcrunch.com/feed/',  'global'),
  ('VentureBeat', 'https://venturebeat.com/feed/', 'global')
on conflict do nothing;

-- ============ RLS ============
alter table sources         enable row level security;
alter table companies       enable row level security;
alter table funding_rounds  enable row level security;
alter table roles           enable row level security;
alter table outreach_cards  enable row level security;
alter table ingested_items  enable row level security;

-- authenticated users can read app data
drop policy if exists "read_companies" on companies;
create policy "read_companies" on companies for select to authenticated using (true);

drop policy if exists "read_rounds" on funding_rounds;
create policy "read_rounds" on funding_rounds for select to authenticated using (true);

drop policy if exists "read_roles" on roles;
create policy "read_roles" on roles for select to authenticated using (true);

drop policy if exists "read_cards" on outreach_cards;
create policy "read_cards" on outreach_cards for select to authenticated using (true);

drop policy if exists "read_sources" on sources;
create policy "read_sources" on sources for select to authenticated using (true);

-- ingested_items + writes are service-role only (bypasses RLS), no policies needed
