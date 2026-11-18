-- Fix remaining multi-tenant setup (safe to re-run).
-- Printify IDs optional: columns are nullable until you sync later.

-- ---------------------------------------------------------------------------
-- Ensure tables exist first
-- ---------------------------------------------------------------------------
create table if not exists public.store_settings (
  store_id text primary key,
  site_name text,
  default_currency text default 'USD',
  printify_shop_id text,
  settings jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.designs (
  id uuid primary key default gen_random_uuid(),
  store_id text not null default 'memonuvia',
  slug text not null,
  name text not null,
  category text,
  image_url text,
  active boolean default true,
  printify_product_id text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  store_id text not null default 'memonuvia',
  user_id uuid references auth.users(id) on delete cascade,
  session_key text,
  product_slug text not null,
  product_name text not null,
  variant_id text,
  variant_label text,
  quantity integer not null default 1,
  unit_price numeric(10,2) not null default 0,
  currency text not null default 'USD',
  custom_text text,
  photo_url text,
  image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- admin_users is a VIEW here — use store_admins TABLE instead
create table if not exists public.store_admins (
  id uuid primary key default gen_random_uuid(),
  store_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text,
  role text not null default 'admin',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (store_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Add missing columns (Printify optional / nullable)
-- ---------------------------------------------------------------------------
alter table public.products add column if not exists store_id text;
alter table public.products add column if not exists printify_product_id text;
update public.products
  set store_id = coalesce(nullif(store_id, ''), 'memonuvia')
  where store_id is null or store_id = '';
alter table public.products alter column store_id set not null;

alter table public.designs add column if not exists store_id text;
alter table public.designs add column if not exists printify_product_id text;
update public.designs
  set store_id = coalesce(nullif(store_id, ''), 'memonuvia')
  where store_id is null or store_id = '';
alter table public.designs alter column store_id set not null;

alter table public.orders add column if not exists store_id text;
update public.orders
  set store_id = coalesce(nullif(store_id, ''), 'memonuvia')
  where store_id is null or store_id = '';
alter table public.orders alter column store_id set not null;

alter table public.cart_items add column if not exists store_id text;
update public.cart_items
  set store_id = coalesce(nullif(store_id, ''), 'memonuvia')
  where store_id is null or store_id = '';
alter table public.cart_items alter column store_id set not null;

alter table public.customer_uploads add column if not exists store_id text;
update public.customer_uploads
  set store_id = coalesce(nullif(store_id, ''), 'memonuvia')
  where store_id is null or store_id = '';
alter table public.customer_uploads alter column store_id set not null;

-- ---------------------------------------------------------------------------
-- Constraints / indexes
-- ---------------------------------------------------------------------------
do $$ begin
  alter table public.orders drop constraint if exists orders_order_number_key;
exception when undefined_object then null;
end $$;

create unique index if not exists orders_store_order_number_uidx
  on public.orders (store_id, order_number);

create unique index if not exists products_store_slug_uidx
  on public.products (store_id, slug);

-- Only indexes rows that already have a Printify id (fine if all are NULL now)
create unique index if not exists products_store_printify_uidx
  on public.products (store_id, printify_product_id)
  where printify_product_id is not null;

create unique index if not exists designs_store_slug_uidx
  on public.designs (store_id, slug);

create unique index if not exists designs_store_printify_uidx
  on public.designs (store_id, printify_product_id)
  where printify_product_id is not null;

create index if not exists orders_store_created_at_idx on public.orders (store_id, created_at desc);
create index if not exists orders_store_payment_idx on public.orders (store_id, payment_status);
create index if not exists products_store_created_at_idx on public.products (store_id, created_at desc);
create index if not exists products_store_printify_idx on public.products (store_id, printify_product_id);
create index if not exists designs_store_created_at_idx on public.designs (store_id, created_at desc);
create index if not exists cart_items_store_user_idx on public.cart_items (store_id, user_id);
create index if not exists store_admins_store_user_idx on public.store_admins (store_id, user_id);
create index if not exists customer_uploads_store_idx on public.customer_uploads (store_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS for store_admins
-- ---------------------------------------------------------------------------
alter table public.store_admins enable row level security;

drop policy if exists "store admins read self" on public.store_admins;
create policy "store admins read self" on public.store_admins
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "admin manage store_admins" on public.store_admins;
create policy "admin manage store_admins" on public.store_admins
  for all using (public.is_admin()) with check (public.is_admin());

insert into public.store_settings (store_id, site_name, default_currency)
values ('memonuvia', 'MemoNuvia', 'USD')
on conflict (store_id) do nothing;

do $$ begin
  alter publication supabase_realtime add table public.orders;
exception when duplicate_object then null; end $$;
