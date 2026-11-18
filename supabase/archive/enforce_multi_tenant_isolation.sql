-- =============================================================================
-- enforce_multi_tenant_isolation.sql (idempotent)
-- Shared: auth.users + public.profiles
-- Isolated: products, designs, orders, cart_items, store_settings, store_admins,
--           customer_uploads
-- NOTE: public.admin_users may already exist as a VIEW in shared projects —
--       we use store_admins (TABLE) to avoid that conflict.
-- Service role bypasses RLS — application MUST filter by store_id.
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Shared profiles (NO store_id)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  preferred_currency text default 'USD',
  preferred_country text default 'US',
  shipping_address jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Store-isolated tables
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id text not null,
  store_id text not null,
  slug text not null,
  name text not null,
  subtitle text,
  description text,
  category text not null default 'family',
  image text,
  price_usd numeric(10,2) not null default 0,
  price_gbp numeric(10,2) not null default 0,
  active boolean default true,
  featured boolean default false,
  printify_product_id text,
  sample_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (store_id, id)
);

alter table public.products add column if not exists store_id text;
alter table public.products add column if not exists printify_product_id text;
update public.products set store_id = coalesce(nullif(store_id, ''), 'memonuvia') where store_id is null or store_id = '';
alter table public.products alter column store_id set not null;

create table if not exists public.product_variants (
  id text not null,
  store_id text not null default 'memonuvia',
  product_id text not null,
  label text not null,
  shape text,
  size text,
  printify_variant_id text,
  price_usd numeric(10,2),
  price_gbp numeric(10,2),
  active boolean default true,
  primary key (store_id, id)
);

alter table public.product_variants add column if not exists store_id text;
update public.product_variants set store_id = coalesce(nullif(store_id, ''), 'memonuvia') where store_id is null or store_id = '';
alter table public.product_variants alter column store_id set not null;

create table if not exists public.designs (
  id uuid primary key default gen_random_uuid(),
  store_id text not null,
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

alter table public.designs add column if not exists store_id text;
alter table public.designs add column if not exists printify_product_id text;
update public.designs set store_id = coalesce(nullif(store_id, ''), 'memonuvia') where store_id is null or store_id = '';
alter table public.designs alter column store_id set not null;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  store_id text not null,
  order_number text not null,
  user_id uuid references auth.users(id) on delete set null,
  customer_email text,
  customer_name text,
  currency text not null default 'USD',
  subtotal numeric(10,2) not null default 0,
  shipping_cost numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  payment_status text not null default 'pending',
  design_status text not null default 'awaiting_artwork',
  printify_status text not null default 'not_sent',
  shipping_address jsonb,
  stripe_session_id text,
  stripe_payment_intent text,
  printify_order_id text,
  printify_error_log text,
  tracking_number text,
  tracking_url text,
  carrier text,
  notes text,
  paid_at timestamptz,
  shipped_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders add column if not exists store_id text;
update public.orders set store_id = coalesce(nullif(store_id, ''), 'memonuvia') where store_id is null or store_id = '';
alter table public.orders alter column store_id set not null;

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text,
  product_slug text,
  product_name text not null,
  variant_id text,
  variant_label text,
  quantity integer not null default 1,
  unit_price numeric(10,2) not null default 0,
  custom_text text,
  photo_url text,
  final_print_file_url text,
  printify_product_id text,
  printify_variant_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  store_id text not null,
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

alter table public.cart_items add column if not exists store_id text;
update public.cart_items set store_id = coalesce(nullif(store_id, ''), 'memonuvia') where store_id is null or store_id = '';
alter table public.cart_items alter column store_id set not null;

create table if not exists public.store_settings (
  store_id text primary key,
  site_name text,
  default_currency text default 'USD',
  printify_shop_id text,
  settings jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Store-scoped admins (avoid colliding with existing admin_users VIEW)
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

create table if not exists public.customer_uploads (
  id uuid primary key default gen_random_uuid(),
  store_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  storage_path text not null,
  public_url text,
  original_name text,
  mime_type text,
  size_bytes integer,
  created_at timestamptz not null default now()
);

alter table public.customer_uploads add column if not exists store_id text;
update public.customer_uploads set store_id = coalesce(nullif(store_id, ''), 'memonuvia') where store_id is null or store_id = '';
alter table public.customer_uploads alter column store_id set not null;

-- ---------------------------------------------------------------------------
-- Drop GLOBAL unique constraints that would collide across stores
-- ---------------------------------------------------------------------------
do $$ begin
  alter table public.orders drop constraint if exists orders_order_number_key;
exception when undefined_object then null;
end $$;

do $$ begin
  alter table public.products drop constraint if exists products_printify_product_id_key;
exception when undefined_object then null;
end $$;

do $$ begin
  alter table public.designs drop constraint if exists designs_printify_product_id_key;
exception when undefined_object then null;
end $$;

-- Composite uniques
create unique index if not exists orders_store_order_number_uidx
  on public.orders (store_id, order_number);

create unique index if not exists products_store_slug_uidx
  on public.products (store_id, slug);

create unique index if not exists products_store_printify_uidx
  on public.products (store_id, printify_product_id)
  where printify_product_id is not null;

create unique index if not exists designs_store_slug_uidx
  on public.designs (store_id, slug);

create unique index if not exists designs_store_printify_uidx
  on public.designs (store_id, printify_product_id)
  where printify_product_id is not null;

-- Composite indexes for common filters
create index if not exists orders_store_created_at_idx on public.orders (store_id, created_at desc);
create index if not exists orders_store_payment_idx on public.orders (store_id, payment_status);
create index if not exists products_store_created_at_idx on public.products (store_id, created_at desc);
create index if not exists products_store_printify_idx on public.products (store_id, printify_product_id);
create index if not exists designs_store_created_at_idx on public.designs (store_id, created_at desc);
create index if not exists cart_items_store_user_idx on public.cart_items (store_id, user_id);
create index if not exists store_admins_store_user_idx on public.store_admins (store_id, user_id);
create index if not exists customer_uploads_store_idx on public.customer_uploads (store_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Auth trigger (shared profiles)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    'customer'
  )
  on conflict (id) do update set email = excluded.email, updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.designs enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.cart_items enable row level security;
alter table public.store_settings enable row level security;
alter table public.store_admins enable row level security;
alter table public.customer_uploads enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles for select using (auth.uid() = id or public.is_admin());
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles for update using (auth.uid() = id);

drop policy if exists "public read products" on public.products;
create policy "public read products" on public.products for select using (active = true or public.is_admin());
drop policy if exists "admin manage products" on public.products;
create policy "admin manage products" on public.products for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read designs" on public.designs;
create policy "public read designs" on public.designs for select using (active = true or public.is_admin());
drop policy if exists "admin manage designs" on public.designs;
create policy "admin manage designs" on public.designs for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "users read own orders" on public.orders;
create policy "users read own orders" on public.orders for select using (auth.uid() = user_id or public.is_admin());
drop policy if exists "admin manage orders" on public.orders;
create policy "admin manage orders" on public.orders for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "users manage own cart items" on public.cart_items;
create policy "users manage own cart items" on public.cart_items for all
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "public read store settings" on public.store_settings;
create policy "public read store settings" on public.store_settings for select using (true);
drop policy if exists "admin manage store settings" on public.store_settings;
create policy "admin manage store settings" on public.store_settings
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "users manage own uploads" on public.customer_uploads;
create policy "users manage own uploads" on public.customer_uploads for all
  using (auth.uid() = user_id or user_id is null or public.is_admin())
  with check (auth.uid() = user_id or user_id is null or public.is_admin());

drop policy if exists "store admins read self" on public.store_admins;
create policy "store admins read self" on public.store_admins
  for select using (auth.uid() = user_id or public.is_admin());
drop policy if exists "admin manage store_admins" on public.store_admins;
create policy "admin manage store_admins" on public.store_admins
  for all using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public)
values ('customer-uploads', 'customer-uploads', false)
on conflict (id) do nothing;

insert into public.store_settings (store_id, site_name, default_currency)
values ('memonuvia', 'MemoNuvia', 'USD')
on conflict (store_id) do nothing;

do $$ begin
  alter publication supabase_realtime add table public.orders;
exception when duplicate_object then null; end $$;
