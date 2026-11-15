-- MemoNuvia platform hardening: profiles addresses, personalizations,
-- fulfillment retry queue, webhook idempotency, realtime, status map

-- Profiles: durable address + preferences (cross-device)
alter table public.profiles
  add column if not exists phone text,
  add column if not exists shipping_address jsonb default '{}'::jsonb,
  add column if not exists billing_address jsonb default '{}'::jsonb,
  add column if not exists preferences jsonb default '{}'::jsonb;

-- Order items: font + original filename + print-ready flag
alter table public.order_items
  add column if not exists font_family text default 'script',
  add column if not exists photo_original_name text,
  add column if not exists photo_storage_path text,
  add column if not exists personalization_meta jsonb default '{}'::jsonb;

-- Canonical fulfillment statuses used by storefront + admin
-- pending | processing | shipped | delivered (+ payment/printify pipeline states kept)
do $$
begin
  alter table public.orders drop constraint if exists orders_status_check;
exception when undefined_object then null;
end $$;

alter table public.orders
  add column if not exists fulfillment_status text not null default 'pending'
    check (fulfillment_status in ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  add column if not exists printify_status text,
  add column if not exists printify_last_error text,
  add column if not exists printify_attempts integer not null default 0,
  add column if not exists paid_at timestamptz,
  add column if not exists shipped_at timestamptz,
  add column if not exists delivered_at timestamptz;

-- Dedicated personalizations table (1:1 with order_items for rich media)
create table if not exists public.personalizations (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null unique references public.order_items(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  photo_url text,
  photo_storage_path text,
  photo_original_name text,
  custom_text text,
  font_family text default 'script',
  preview_url text,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists personalizations_order_id_idx on public.personalizations(order_id);

-- Idempotent Stripe webhook / fulfillment job queue
create table if not exists public.webhook_events (
  id text primary key,
  source text not null,
  event_type text,
  payload jsonb,
  processed_at timestamptz not null default now()
);

create table if not exists public.fulfillment_jobs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  job_type text not null default 'printify_push',
  status text not null default 'pending'
    check (status in ('pending', 'running', 'succeeded', 'failed', 'dead')),
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  last_error text,
  next_run_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fulfillment_jobs_pending_idx
  on public.fulfillment_jobs(status, next_run_at)
  where status in ('pending', 'failed');

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

drop trigger if exists personalizations_set_updated_at on public.personalizations;
create trigger personalizations_set_updated_at
  before update on public.personalizations
  for each row execute function public.set_updated_at();

drop trigger if exists fulfillment_jobs_set_updated_at on public.fulfillment_jobs;
create trigger fulfillment_jobs_set_updated_at
  before update on public.fulfillment_jobs
  for each row execute function public.set_updated_at();

-- RLS
alter table public.personalizations enable row level security;
alter table public.webhook_events enable row level security;
alter table public.fulfillment_jobs enable row level security;

drop policy if exists "Users read own personalizations" on public.personalizations;
create policy "Users read own personalizations"
  on public.personalizations for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.orders o
      where o.id = personalizations.order_id and o.user_id = auth.uid()
    )
  );

drop policy if exists "Insert personalizations with order" on public.personalizations;
create policy "Insert personalizations with order"
  on public.personalizations for insert
  with check (
    public.is_admin()
    or exists (
      select 1 from public.orders o
      where o.id = personalizations.order_id
        and (o.user_id = auth.uid() or o.user_id is null)
    )
  );

drop policy if exists "Admins manage personalizations" on public.personalizations;
create policy "Admins manage personalizations"
  on public.personalizations for all
  using (public.is_admin())
  with check (public.is_admin());

-- webhook_events + fulfillment_jobs: service role only (no anon policies)
drop policy if exists "Admins read webhook events" on public.webhook_events;
create policy "Admins read webhook events"
  on public.webhook_events for select
  using (public.is_admin());

drop policy if exists "Admins read fulfillment jobs" on public.fulfillment_jobs;
create policy "Admins read fulfillment jobs"
  on public.fulfillment_jobs for select
  using (public.is_admin());

drop policy if exists "Admins manage fulfillment jobs" on public.fulfillment_jobs;
create policy "Admins manage fulfillment jobs"
  on public.fulfillment_jobs for all
  using (public.is_admin())
  with check (public.is_admin());

-- Realtime: orders + order_items + fulfillment_jobs
do $$
begin
  alter publication supabase_realtime add table public.order_items;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.fulfillment_jobs;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.personalizations;
exception when duplicate_object then null;
end $$;
