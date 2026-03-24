-- ============================================================
-- Estimator Pro – Supabase schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ── CONTRACTORS ──────────────────────────────────────────────────────────────
-- One row per logged-in user (each contractor has their own data).
-- Linked to auth.users via Row Level Security.
create table public.contractors (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  tax_number    text,
  address       text,
  email         text,
  phone         text,
  bank_account  text,
  logo_url      text,
  created_at    timestamptz default now(),

  unique (user_id)     -- one contractor profile per user
);

-- ── CLIENTS ──────────────────────────────────────────────────────────────────
create table public.clients (
  id                   uuid primary key default gen_random_uuid(),
  contractor_id        uuid not null references public.contractors(id) on delete cascade,
  name                 text not null,
  tax_number           text,
  address              text,
  email                text,
  phone                text,
  contact_person       text,
  stripe_customer_id   text,          -- populated after first Stripe call
  notes                text,
  created_at           timestamptz default now()
);

create index on public.clients (contractor_id);

-- ── PROJECTS ─────────────────────────────────────────────────────────────────
create table public.projects (
  id                uuid primary key default gen_random_uuid(),
  contractor_id     uuid not null references public.contractors(id) on delete cascade,
  client_id         uuid not null references public.clients(id),
  name              text not null,
  address           text,
  status            text not null default 'draft'
                      check (status in ('draft','sent','accepted','rejected')),
  markup_pct        numeric(5,2) not null default 20,
  vat_pct           numeric(5,2) not null default 27,
  currency          text not null default 'HUF',
  valid_until       date,
  notes             text,
  stripe_invoice_id text,             -- populated after Stripe invoice creation
  stripe_invoice_url text,
  stripe_pdf_url    text,
  version           integer not null default 1,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create index on public.projects (contractor_id);
create index on public.projects (client_id);
create index on public.projects (status);

-- auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ── LINE ITEMS ────────────────────────────────────────────────────────────────
create table public.line_items (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  category        text not null,
  name            text not null,
  unit            text not null,
  quantity        numeric(10,3) not null default 1,
  mat_price       numeric(12,2) not null default 0,  -- net material price / unit
  labor_price     numeric(12,2) not null default 0,  -- net labor price / unit
  sort_order      integer not null default 0,
  created_at      timestamptz default now()
);

create index on public.line_items (project_id);

-- ── MATERIAL CATALOG ─────────────────────────────────────────────────────────
-- Shared catalog (available to all users) + contractor-specific custom items
create table public.material_catalog (
  id              uuid primary key default gen_random_uuid(),
  contractor_id   uuid references public.contractors(id) on delete cascade, -- null = global
  category        text not null,
  name            text not null,
  unit            text not null,
  base_mat_price  numeric(12,2) not null default 0,
  base_labor_price numeric(12,2) not null default 0,
  supplier        text,
  updated_at      timestamptz default now()
);

create index on public.material_catalog (contractor_id);
create index on public.material_catalog (category);

-- ── ROW LEVEL SECURITY ───────────────────────────────────────────────────────
-- Every table is locked down so contractors only see their own data.

alter table public.contractors   enable row level security;
alter table public.clients       enable row level security;
alter table public.projects      enable row level security;
alter table public.line_items    enable row level security;
alter table public.material_catalog enable row level security;

-- contractors: own row only
create policy "contractors: own" on public.contractors
  using (user_id = auth.uid());

-- clients: own contractor's clients
create policy "clients: own contractor" on public.clients
  using (contractor_id in (
    select id from public.contractors where user_id = auth.uid()
  ));

-- projects: own contractor's projects
create policy "projects: own contractor" on public.projects
  using (contractor_id in (
    select id from public.contractors where user_id = auth.uid()
  ));

-- line_items: via project ownership
create policy "line_items: own project" on public.line_items
  using (project_id in (
    select p.id from public.projects p
    join public.contractors c on c.id = p.contractor_id
    where c.user_id = auth.uid()
  ));

-- material_catalog: global rows visible to all; custom rows only to owner
create policy "catalog: global visible" on public.material_catalog
  for select using (contractor_id is null);

create policy "catalog: own custom" on public.material_catalog
  using (
    contractor_id is null
    or contractor_id in (
      select id from public.contractors where user_id = auth.uid()
    )
  );

-- ── HELPER VIEW: projects with totals ────────────────────────────────────────
-- Computes net / vat / gross directly in SQL for fast dashboard queries.
create or replace view public.project_totals as
select
  p.id                               as project_id,
  p.name,
  p.status,
  p.currency,
  p.markup_pct,
  p.vat_pct,
  p.valid_until,
  p.created_at,
  c.name                             as client_name,
  count(li.id)                       as item_count,

  -- Net = direct_cost × (1 + markup)
  sum(
    (li.mat_price + li.labor_price) * li.quantity
    * (1 + p.markup_pct / 100)
  )                                  as total_net,

  -- VAT
  sum(
    (li.mat_price + li.labor_price) * li.quantity
    * (1 + p.markup_pct / 100)
    * (p.vat_pct / 100)
  )                                  as total_vat,

  -- Gross
  sum(
    (li.mat_price + li.labor_price) * li.quantity
    * (1 + p.markup_pct / 100)
    * (1 + p.vat_pct / 100)
  )                                  as total_gross

from public.projects p
join public.clients c on c.id = p.client_id
left join public.line_items li on li.project_id = p.id
group by p.id, c.name;
