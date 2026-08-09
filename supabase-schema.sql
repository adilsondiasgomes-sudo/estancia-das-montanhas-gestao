-- Sistema Estancia das Montanhas - V18.2
-- Fundacao Supabase: schema completo + perfis + Row Level Security.
-- Antes de usar em producao, crie usuarios no Supabase Auth e associe cada auth.uid()
-- a um registro em public.profiles com role = 'manager' ou 'operator'.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text,
  role text not null check (role in ('manager','operator')),
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() = 'manager', false)
$$;

create or replace function public.is_operator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() in ('manager','operator'), false)
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  document text,
  email text,
  birth_date date,
  preferred_contact text,
  address text,
  city text,
  state text,
  origin text,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text,
  capacity integer not null default 0 check (capacity >= 0),
  base_rate numeric(12,2) not null default 0 check (base_rate >= 0),
  status text not null default 'Disponível',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id),
  space_id uuid not null references public.spaces(id),
  type text not null,
  package_name text,
  start_date date not null,
  start_time time,
  end_date date not null,
  end_time time,
  guests integer not null default 0 check (guests >= 0),
  exclusive_use text not null default 'Sim',
  confirmation_deadline date,
  total numeric(12,2) not null default 0 check (total >= 0),
  paid numeric(12,2) not null default 0 check (paid >= 0),
  status text not null default 'Solicitada',
  checklist text,
  checkin_at timestamptz,
  checkout_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reservations_period_check check (end_date >= start_date),
  constraint reservations_paid_check check (paid <= total or total = 0)
);

create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id),
  contractor_cpf text,
  reservation_id uuid references public.reservations(id) on delete set null,
  full_name text not null,
  cpf text,
  address text,
  stay_start date,
  stay_end date,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guests_period_check check (stay_end is null or stay_start is null or stay_end >= stay_start)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  type text not null check (type in ('Entrada','Saída')),
  client_id uuid references public.clients(id),
  reservation_id uuid references public.reservations(id),
  category text not null,
  description text,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  status text not null default 'Pendente',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.maintenance (
  id uuid primary key default gen_random_uuid(),
  due date,
  area text,
  system text,
  priority text,
  responsible text,
  status text not null default 'Pendente',
  description text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cleaning (
  id uuid primary key default gen_random_uuid(),
  date date,
  area text,
  type text,
  responsible text,
  status text not null default 'Pendente',
  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.laundry (
  id uuid primary key default gen_random_uuid(),
  date date,
  item text not null,
  qty integer not null default 0 check (qty >= 0),
  status text not null default 'A lavar',
  cost numeric(12,2) not null default 0 check (cost >= 0),
  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  item text not null,
  category text,
  qty integer not null default 0 check (qty >= 0),
  minimum integer not null default 0 check (minimum >= 0),
  condition text,
  location text,
  replacement_value numeric(12,2) not null default 0 check (replacement_value >= 0),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.utilities (
  id uuid primary key default gen_random_uuid(),
  month text not null,
  type text not null,
  reading numeric(12,2) not null default 0 check (reading >= 0),
  amount numeric(12,2) not null default 0 check (amount >= 0),
  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  phone text,
  pay_type text,
  rate numeric(12,2) not null default 0 check (rate >= 0),
  status text not null default 'Ativo',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reservations_start_status_idx on public.reservations(start_date,status);
create index if not exists reservations_client_idx on public.reservations(client_id);
create index if not exists guests_reservation_idx on public.guests(reservation_id);
create index if not exists transactions_date_status_idx on public.transactions(date,status);
create index if not exists transactions_client_idx on public.transactions(client_id);
create index if not exists transactions_reservation_idx on public.transactions(reservation_id);

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'profiles','clients','spaces','reservations','guests','transactions',
    'maintenance','cleaning','laundry','inventory','utilities','employees'
  ]
  loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', tbl, tbl);
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.touch_updated_at()', tbl, tbl);
  end loop;
end $$;

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.spaces enable row level security;
alter table public.reservations enable row level security;
alter table public.guests enable row level security;
alter table public.transactions enable row level security;
alter table public.maintenance enable row level security;
alter table public.cleaning enable row level security;
alter table public.laundry enable row level security;
alter table public.inventory enable row level security;
alter table public.utilities enable row level security;
alter table public.employees enable row level security;

drop policy if exists "profiles_read_own_or_manager" on public.profiles;
create policy "profiles_read_own_or_manager" on public.profiles for select using (id = auth.uid() or public.is_manager());
drop policy if exists "profiles_insert_manager" on public.profiles;
create policy "profiles_insert_manager" on public.profiles for insert with check (public.is_manager());
drop policy if exists "profiles_insert_self_operator" on public.profiles;
create policy "profiles_insert_self_operator" on public.profiles for insert with check (id = auth.uid() and role = 'operator');
drop policy if exists "profiles_update_manager" on public.profiles;
create policy "profiles_update_manager" on public.profiles for update using (public.is_manager()) with check (public.is_manager());
drop policy if exists "profiles_delete_manager" on public.profiles;
create policy "profiles_delete_manager" on public.profiles for delete using (public.is_manager());

drop policy if exists "clients_select_operator" on public.clients;
create policy "clients_select_operator" on public.clients for select using (public.is_operator());
drop policy if exists "clients_insert_operator" on public.clients;
create policy "clients_insert_operator" on public.clients for insert with check (public.is_operator());
drop policy if exists "clients_update_operator" on public.clients;
create policy "clients_update_operator" on public.clients for update using (public.is_operator()) with check (public.is_operator());
drop policy if exists "clients_delete_manager" on public.clients;
create policy "clients_delete_manager" on public.clients for delete using (public.is_manager());

drop policy if exists "spaces_select_operator" on public.spaces;
create policy "spaces_select_operator" on public.spaces for select using (public.is_operator());
drop policy if exists "spaces_insert_manager" on public.spaces;
create policy "spaces_insert_manager" on public.spaces for insert with check (public.is_manager());
drop policy if exists "spaces_update_manager" on public.spaces;
create policy "spaces_update_manager" on public.spaces for update using (public.is_manager()) with check (public.is_manager());
drop policy if exists "spaces_delete_manager" on public.spaces;
create policy "spaces_delete_manager" on public.spaces for delete using (public.is_manager());

drop policy if exists "reservations_select_operator" on public.reservations;
create policy "reservations_select_operator" on public.reservations for select using (public.is_operator());
drop policy if exists "reservations_insert_operator" on public.reservations;
create policy "reservations_insert_operator" on public.reservations for insert with check (public.is_operator());
drop policy if exists "reservations_update_operator" on public.reservations;
create policy "reservations_update_operator" on public.reservations for update using (public.is_operator()) with check (public.is_operator());
drop policy if exists "reservations_delete_manager" on public.reservations;
create policy "reservations_delete_manager" on public.reservations for delete using (public.is_manager());

drop policy if exists "guests_select_operator" on public.guests;
create policy "guests_select_operator" on public.guests for select using (public.is_operator());
drop policy if exists "guests_insert_operator" on public.guests;
create policy "guests_insert_operator" on public.guests for insert with check (public.is_operator());
drop policy if exists "guests_update_operator" on public.guests;
create policy "guests_update_operator" on public.guests for update using (public.is_operator()) with check (public.is_operator());
drop policy if exists "guests_delete_manager" on public.guests;
create policy "guests_delete_manager" on public.guests for delete using (public.is_manager());

drop policy if exists "transactions_select_manager" on public.transactions;
create policy "transactions_select_manager" on public.transactions for select using (public.is_manager());
drop policy if exists "transactions_insert_manager" on public.transactions;
create policy "transactions_insert_manager" on public.transactions for insert with check (public.is_manager());
drop policy if exists "transactions_update_manager" on public.transactions;
create policy "transactions_update_manager" on public.transactions for update using (public.is_manager()) with check (public.is_manager());
drop policy if exists "transactions_delete_manager" on public.transactions;
create policy "transactions_delete_manager" on public.transactions for delete using (public.is_manager());

drop policy if exists "maintenance_select_operator" on public.maintenance;
create policy "maintenance_select_operator" on public.maintenance for select using (public.is_operator());
drop policy if exists "maintenance_insert_operator" on public.maintenance;
create policy "maintenance_insert_operator" on public.maintenance for insert with check (public.is_operator());
drop policy if exists "maintenance_update_operator" on public.maintenance;
create policy "maintenance_update_operator" on public.maintenance for update using (public.is_operator()) with check (public.is_operator());
drop policy if exists "maintenance_delete_manager" on public.maintenance;
create policy "maintenance_delete_manager" on public.maintenance for delete using (public.is_manager());

drop policy if exists "cleaning_select_operator" on public.cleaning;
create policy "cleaning_select_operator" on public.cleaning for select using (public.is_operator());
drop policy if exists "cleaning_insert_operator" on public.cleaning;
create policy "cleaning_insert_operator" on public.cleaning for insert with check (public.is_operator());
drop policy if exists "cleaning_update_operator" on public.cleaning;
create policy "cleaning_update_operator" on public.cleaning for update using (public.is_operator()) with check (public.is_operator());
drop policy if exists "cleaning_delete_manager" on public.cleaning;
create policy "cleaning_delete_manager" on public.cleaning for delete using (public.is_manager());

drop policy if exists "laundry_select_operator" on public.laundry;
create policy "laundry_select_operator" on public.laundry for select using (public.is_operator());
drop policy if exists "laundry_insert_operator" on public.laundry;
create policy "laundry_insert_operator" on public.laundry for insert with check (public.is_operator());
drop policy if exists "laundry_update_operator" on public.laundry;
create policy "laundry_update_operator" on public.laundry for update using (public.is_operator()) with check (public.is_operator());
drop policy if exists "laundry_delete_manager" on public.laundry;
create policy "laundry_delete_manager" on public.laundry for delete using (public.is_manager());

drop policy if exists "inventory_select_operator" on public.inventory;
create policy "inventory_select_operator" on public.inventory for select using (public.is_operator());
drop policy if exists "inventory_insert_operator" on public.inventory;
create policy "inventory_insert_operator" on public.inventory for insert with check (public.is_operator());
drop policy if exists "inventory_update_operator" on public.inventory;
create policy "inventory_update_operator" on public.inventory for update using (public.is_operator()) with check (public.is_operator());
drop policy if exists "inventory_delete_manager" on public.inventory;
create policy "inventory_delete_manager" on public.inventory for delete using (public.is_manager());

drop policy if exists "utilities_select_operator" on public.utilities;
create policy "utilities_select_operator" on public.utilities for select using (public.is_operator());
drop policy if exists "utilities_insert_operator" on public.utilities;
create policy "utilities_insert_operator" on public.utilities for insert with check (public.is_operator());
drop policy if exists "utilities_update_operator" on public.utilities;
create policy "utilities_update_operator" on public.utilities for update using (public.is_operator()) with check (public.is_operator());
drop policy if exists "utilities_delete_manager" on public.utilities;
create policy "utilities_delete_manager" on public.utilities for delete using (public.is_manager());

drop policy if exists "employees_select_manager" on public.employees;
create policy "employees_select_manager" on public.employees for select using (public.is_manager());
drop policy if exists "employees_insert_manager" on public.employees;
create policy "employees_insert_manager" on public.employees for insert with check (public.is_manager());
drop policy if exists "employees_update_manager" on public.employees;
create policy "employees_update_manager" on public.employees for update using (public.is_manager()) with check (public.is_manager());
drop policy if exists "employees_delete_manager" on public.employees;
create policy "employees_delete_manager" on public.employees for delete using (public.is_manager());
