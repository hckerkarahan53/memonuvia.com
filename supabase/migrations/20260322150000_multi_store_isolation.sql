-- Multi-store isolation: shared Auth/profiles, store-scoped commerce data
-- Profiles remain shared across brands (no store_id).

-- Ensure store_id on products / orders
alter table public.products
  add column if not exists store_id text not null default 'memonuvia';

alter table public.orders
  add column if not exists store_id text not null default 'memonuvia';

-- customer_uploads: store partition
alter table public.customer_uploads
  add column if not exists store_id text not null default 'memonuvia';

-- designs (catalog creative assets / mockups per store)
create table if not exists public.designs (
  id uuid primary key default gen_random_uuid(),
  store_id text not null,
  slug text not null,
  name text not null,
  category text,
  image_url text,
  active boolean default true,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, slug)
);

-- cart_items (optional DB-backed carts; client cart still store-keyed)
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

-- store_settings (per-brand config)
create table if not exists public.store_settings (
  store_id text primary key,
  site_name text,
  default_currency text default 'USD',
  printify_shop_id text,
  settings jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Order numbers unique per store (not globally)
do $$ begin
  alter table public.orders drop constraint if exists orders_order_number_key;
exception when undefined_object then null;
end $$;

create unique index if not exists orders_store_order_number_uidx
  on public.orders (store_id, order_number);

create index if not exists customer_uploads_store_id_idx on public.customer_uploads(store_id);
create index if not exists designs_store_id_idx on public.designs(store_id);
create index if not exists cart_items_store_user_idx on public.cart_items(store_id, user_id);
create index if not exists products_store_id_idx on public.products(store_id);
create index if not exists orders_store_id_idx on public.orders(store_id);

-- RLS
alter table public.designs enable row level security;
alter table public.cart_items enable row level security;
alter table public.store_settings enable row level security;

drop policy if exists "public read designs" on public.designs;
create policy "public read designs" on public.designs
  for select using (active = true or public.is_admin());

drop policy if exists "admin manage designs" on public.designs;
create policy "admin manage designs" on public.designs
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "users manage own cart items" on public.cart_items;
create policy "users manage own cart items" on public.cart_items
  for all using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "public read store settings" on public.store_settings;
create policy "public read store settings" on public.store_settings
  for select using (true);

drop policy if exists "admin manage store settings" on public.store_settings;
create policy "admin manage store settings" on public.store_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- Seed this storefront settings row (safe upsert)
insert into public.store_settings (store_id, site_name, default_currency)
values ('memonuvia', 'MemoNuvia', 'USD')
on conflict (store_id) do nothing;

-- NOTE: Service role bypasses RLS. Application code MUST always
-- .eq('store_id', NEXT_PUBLIC_STORE_ID) on store-scoped tables.
