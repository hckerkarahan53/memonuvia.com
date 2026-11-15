-- MemoNuvia.com initial schema
-- Run via Supabase SQL editor or: supabase db push

create extension if not exists "pgcrypto";

-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  preferred_currency text default 'USD',
  preferred_country text default 'US',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Products cache (synced from Printify + local enrichment)
create table if not exists public.products (
  id text primary key,
  slug text unique not null,
  name text not null,
  subtitle text,
  description text,
  collection text,
  price numeric(10,2) not null default 0,
  currency text not null default 'USD',
  shapes jsonb default '[]'::jsonb,
  sizes jsonb default '[]'::jsonb,
  image text,
  preview_image text,
  sample_text text,
  text_placeholder text,
  featured boolean default false,
  active boolean default true,
  printify_product_id text,
  printify_variant_id text,
  printify_raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Orders
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending_payment',
  payment_status text not null default 'unpaid',
  currency text not null default 'USD',
  subtotal numeric(10,2) not null default 0,
  shipping_cost numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  customer_email text,
  customer_name text,
  shipping_address jsonb,
  printify_order_id text,
  stripe_session_id text,
  stripe_payment_intent text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text,
  product_slug text,
  product_name text not null,
  quantity integer not null default 1,
  unit_price numeric(10,2) not null default 0,
  size text,
  shape text,
  personalization_text text,
  photo_url text,
  printify_product_id text,
  printify_variant_id text,
  created_at timestamptz not null default now()
);

create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_created_at_idx on public.orders(created_at desc);
create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists products_collection_idx on public.products(collection);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_list text := coalesce(current_setting('app.admin_emails', true), '');
  is_admin boolean := position(lower(new.email) in lower(admin_list)) > 0;
begin
  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', ''),
    case when is_admin then 'admin' else 'customer' end
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Helper: is admin (uses profiles.role — not user_metadata)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- Profiles policies
drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Products: public read active
drop policy if exists "Public read active products" on public.products;
create policy "Public read active products"
  on public.products for select
  using (active = true or public.is_admin());

drop policy if exists "Admins manage products" on public.products;
create policy "Admins manage products"
  on public.products for all
  using (public.is_admin())
  with check (public.is_admin());

-- Orders: owner + admin
drop policy if exists "Users read own orders" on public.orders;
create policy "Users read own orders"
  on public.orders for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users insert own orders" on public.orders;
create policy "Users insert own orders"
  on public.orders for insert
  with check (auth.uid() = user_id or user_id is null or public.is_admin());

drop policy if exists "Admins update orders" on public.orders;
create policy "Admins update orders"
  on public.orders for update
  using (public.is_admin())
  with check (public.is_admin());

-- Order items
drop policy if exists "Users read own order items" on public.order_items;
create policy "Users read own order items"
  on public.order_items for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.user_id = auth.uid()
    )
  );

drop policy if exists "Insert order items with order" on public.order_items;
create policy "Insert order items with order"
  on public.order_items for insert
  with check (
    public.is_admin()
    or exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (o.user_id = auth.uid() or o.user_id is null)
    )
  );

-- Storage bucket for customer photos
insert into storage.buckets (id, name, public)
values ('order-photos', 'order-photos', true)
on conflict (id) do nothing;

drop policy if exists "Authenticated upload order photos" on storage.objects;
drop policy if exists "Anon upload order photos" on storage.objects;
create policy "Anon upload order photos"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'order-photos');

drop policy if exists "Public read order photos" on storage.objects;
create policy "Public read order photos"
  on storage.objects for select
  using (bucket_id = 'order-photos');

drop policy if exists "Users update own order photos" on storage.objects;
create policy "Users update own order photos"
  on storage.objects for update
  to anon, authenticated
  using (bucket_id = 'order-photos')
  with check (bucket_id = 'order-photos');

-- Realtime for admin order feed (ignore if already added)
do $$
begin
  alter publication supabase_realtime add table public.orders;
exception
  when duplicate_object then null;
end $$;
