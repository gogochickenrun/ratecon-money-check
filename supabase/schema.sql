-- RateConRisk Owner-Operator V6
-- Run this once in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.trucks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  unit_number text not null default '',
  nickname text not null default '',
  year integer,
  make text not null default '',
  model text not null default '',
  monthly_truck_payment numeric(12,2) not null default 0 check (monthly_truck_payment >= 0),
  monthly_insurance numeric(12,2) not null default 0 check (monthly_insurance >= 0),
  monthly_permits numeric(12,2) not null default 0 check (monthly_permits >= 0),
  monthly_other_fixed numeric(12,2) not null default 0 check (monthly_other_fixed >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.loads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  truck_id uuid references public.trucks(id) on delete set null,
  load_number text not null default '',
  broker text not null default '',
  origin text not null default '',
  destination text not null default '',
  pickup_date date,
  delivery_date date,
  status text not null default 'Booked'
    check (status in ('Booked','In Transit','Delivered','Invoiced','Paid')),
  revenue numeric(12,2) not null default 0 check (revenue >= 0),
  loaded_miles numeric(12,2) not null default 0 check (loaded_miles >= 0),
  deadhead_miles numeric(12,2) not null default 0 check (deadhead_miles >= 0),
  risk_score numeric(6,2) not null default 0,
  potential_deductions text not null default '',
  source_filename text not null default '',
  invoice_number text not null default '',
  invoice_date date,
  due_date date,
  paid_date date,
  amount_paid numeric(12,2) not null default 0 check (amount_paid >= 0),
  documents jsonb not null default '{"rateCon":false,"bol":false,"pod":false,"invoice":false,"lumper":false}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  load_id uuid references public.loads(id) on delete cascade,
  truck_id uuid references public.trucks(id) on delete set null,
  category text not null default 'Other',
  amount numeric(12,2) not null default 0 check (amount >= 0),
  expense_date date not null default current_date,
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_trucks_user_id on public.trucks(user_id);
create index if not exists idx_loads_user_id on public.loads(user_id);
create index if not exists idx_loads_pickup_date on public.loads(pickup_date);
create index if not exists idx_loads_broker on public.loads(broker);
create index if not exists idx_expenses_user_id on public.expenses(user_id);
create index if not exists idx_expenses_date on public.expenses(expense_date);

alter table public.trucks enable row level security;
alter table public.loads enable row level security;
alter table public.expenses enable row level security;

drop policy if exists "trucks own rows" on public.trucks;
create policy "trucks own rows"
on public.trucks for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "loads own rows" on public.loads;
create policy "loads own rows"
on public.loads for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "expenses own rows" on public.expenses;
create policy "expenses own rows"
on public.expenses for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.trucks to authenticated;
grant select, insert, update, delete on public.loads to authenticated;
grant select, insert, update, delete on public.expenses to authenticated;
