-- =============================================================================
-- MemoNuvia — FINAL idempotent schema (should not fail mid-run)
-- =============================================================================
create extension if not exists "pgcrypto";

-- ---------- create bare tables ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.products (
  id text primary key,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.product_variants (
  id text primary key
);

create table if not exists public.designs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.customer_uploads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  created_at timestamptz default now()
);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.store_settings (
  store_id text primary key
);

create table if not exists public.store_admins (
  id uuid primary key default gen_random_uuid(),
  store_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  unique (store_id, user_id)
);

-- ---------- helper: add column only if missing ----------
create or replace function public._mn_add_col(p_table text, p_col text, p_type text)
returns void language plpgsql as $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = p_table and column_name = p_col
  ) then
    execute format('alter table public.%I add column %I %s', p_table, p_col, p_type);
  end if;
end;
$$;

-- profiles
select public._mn_add_col('profiles','email','text');
select public._mn_add_col('profiles','full_name','text');
select public._mn_add_col('profiles','avatar_url','text');
select public._mn_add_col('profiles','role','text default ''customer''');
select public._mn_add_col('profiles','preferred_currency','text default ''USD''');
select public._mn_add_col('profiles','preferred_country','text default ''US''');
select public._mn_add_col('profiles','shipping_address','jsonb default ''{}''::jsonb');

-- products
select public._mn_add_col('products','store_id','text');
select public._mn_add_col('products','slug','text');
select public._mn_add_col('products','name','text');
select public._mn_add_col('products','subtitle','text');
select public._mn_add_col('products','description','text');
select public._mn_add_col('products','category','text');
select public._mn_add_col('products','collection','text');
select public._mn_add_col('products','image','text');
select public._mn_add_col('products','preview_image','text');
select public._mn_add_col('products','price_usd','numeric(10,2)');
select public._mn_add_col('products','price_gbp','numeric(10,2)');
select public._mn_add_col('products','price','numeric(10,2)');
select public._mn_add_col('products','currency','text');
select public._mn_add_col('products','shapes','jsonb');
select public._mn_add_col('products','sizes','jsonb');
select public._mn_add_col('products','active','boolean');
select public._mn_add_col('products','featured','boolean');
select public._mn_add_col('products','printify_product_id','text');
select public._mn_add_col('products','printify_variant_id','text');
select public._mn_add_col('products','printify_raw','jsonb');
select public._mn_add_col('products','sample_text','text');
select public._mn_add_col('products','text_placeholder','text');

-- product_variants
select public._mn_add_col('product_variants','store_id','text');
select public._mn_add_col('product_variants','product_id','text');
select public._mn_add_col('product_variants','label','text');
select public._mn_add_col('product_variants','shape','text');
select public._mn_add_col('product_variants','size','text');
select public._mn_add_col('product_variants','printify_variant_id','text');
select public._mn_add_col('product_variants','price_usd','numeric(10,2)');
select public._mn_add_col('product_variants','price_gbp','numeric(10,2)');
select public._mn_add_col('product_variants','active','boolean');

-- designs
select public._mn_add_col('designs','store_id','text');
select public._mn_add_col('designs','slug','text');
select public._mn_add_col('designs','name','text');
select public._mn_add_col('designs','category','text');
select public._mn_add_col('designs','image_url','text');
select public._mn_add_col('designs','active','boolean');
select public._mn_add_col('designs','printify_product_id','text');
select public._mn_add_col('designs','metadata','jsonb');

-- customer_uploads
select public._mn_add_col('customer_uploads','store_id','text');
select public._mn_add_col('customer_uploads','user_id','uuid');
select public._mn_add_col('customer_uploads','storage_path','text');
select public._mn_add_col('customer_uploads','public_url','text');
select public._mn_add_col('customer_uploads','original_name','text');
select public._mn_add_col('customer_uploads','mime_type','text');
select public._mn_add_col('customer_uploads','size_bytes','integer');

-- orders
select public._mn_add_col('orders','store_id','text');
select public._mn_add_col('orders','order_number','text');
select public._mn_add_col('orders','user_id','uuid');
select public._mn_add_col('orders','customer_email','text');
select public._mn_add_col('orders','customer_name','text');
select public._mn_add_col('orders','currency','text');
select public._mn_add_col('orders','subtotal','numeric(10,2)');
select public._mn_add_col('orders','shipping_cost','numeric(10,2)');
select public._mn_add_col('orders','total','numeric(10,2)');
select public._mn_add_col('orders','status','text');
select public._mn_add_col('orders','payment_status','text');
select public._mn_add_col('orders','design_status','text');
select public._mn_add_col('orders','printify_status','text');
select public._mn_add_col('orders','shipping_address','jsonb');
select public._mn_add_col('orders','stripe_session_id','text');
select public._mn_add_col('orders','stripe_payment_intent','text');
select public._mn_add_col('orders','printify_order_id','text');
select public._mn_add_col('orders','printify_error_log','text');
select public._mn_add_col('orders','tracking_number','text');
select public._mn_add_col('orders','tracking_url','text');
select public._mn_add_col('orders','carrier','text');
select public._mn_add_col('orders','notes','text');
select public._mn_add_col('orders','paid_at','timestamptz');
select public._mn_add_col('orders','shipped_at','timestamptz');

-- order_items
select public._mn_add_col('order_items','product_id','text');
select public._mn_add_col('order_items','product_slug','text');
select public._mn_add_col('order_items','product_name','text');
select public._mn_add_col('order_items','variant_id','text');
select public._mn_add_col('order_items','variant_label','text');
select public._mn_add_col('order_items','quantity','integer');
select public._mn_add_col('order_items','unit_price','numeric(10,2)');
select public._mn_add_col('order_items','size','text');
select public._mn_add_col('order_items','shape','text');
select public._mn_add_col('order_items','custom_text','text');
select public._mn_add_col('order_items','personalization_text','text');
select public._mn_add_col('order_items','photo_url','text');
select public._mn_add_col('order_items','final_print_file_url','text');
select public._mn_add_col('order_items','printify_product_id','text');
select public._mn_add_col('order_items','printify_variant_id','text');

-- cart_items
select public._mn_add_col('cart_items','store_id','text');
select public._mn_add_col('cart_items','user_id','uuid');
select public._mn_add_col('cart_items','session_key','text');
select public._mn_add_col('cart_items','product_slug','text');
select public._mn_add_col('cart_items','product_name','text');
select public._mn_add_col('cart_items','variant_id','text');
select public._mn_add_col('cart_items','variant_label','text');
select public._mn_add_col('cart_items','quantity','integer');
select public._mn_add_col('cart_items','unit_price','numeric(10,2)');
select public._mn_add_col('cart_items','currency','text');
select public._mn_add_col('cart_items','custom_text','text');
select public._mn_add_col('cart_items','photo_url','text');
select public._mn_add_col('cart_items','image','text');

-- store_settings (THIS was the last failure: site_name missing)
select public._mn_add_col('store_settings','site_name','text');
select public._mn_add_col('store_settings','default_currency','text');
select public._mn_add_col('store_settings','printify_shop_id','text');
select public._mn_add_col('store_settings','settings','jsonb');
select public._mn_add_col('store_settings','created_at','timestamptz');
select public._mn_add_col('store_settings','updated_at','timestamptz');

-- store_admins
select public._mn_add_col('store_admins','email','text');
select public._mn_add_col('store_admins','role','text');
select public._mn_add_col('store_admins','active','boolean');
select public._mn_add_col('store_admins','created_at','timestamptz');

-- ---------- backfill defaults ----------
update public.products set store_id = 'memonuvia' where store_id is null or store_id = '';
update public.products set active = true where active is null;
update public.products set featured = false where featured is null;
update public.products set category = coalesce(nullif(category,''), coalesce(collection,'family'), 'family');
update public.products set price_usd = coalesce(price_usd, price, 0);
update public.products set price_gbp = coalesce(price_gbp, round(coalesce(price_usd,0)*0.8,2));
update public.products set name = coalesce(name, 'Product') where name is null;
update public.products set slug = coalesce(slug, id::text) where slug is null;

update public.product_variants set store_id = 'memonuvia' where store_id is null or store_id = '';
update public.product_variants set active = true where active is null;
update public.product_variants set label = coalesce(label, id::text) where label is null;

update public.designs set store_id = 'memonuvia' where store_id is null or store_id = '';
update public.designs set active = true where active is null;
update public.designs set name = coalesce(name, 'Design') where name is null;
update public.designs set slug = coalesce(slug, id::text) where slug is null;

update public.customer_uploads set store_id = 'memonuvia' where store_id is null or store_id = '';
update public.customer_uploads set storage_path = coalesce(storage_path, 'unknown') where storage_path is null;

update public.orders set store_id = 'memonuvia' where store_id is null or store_id = '';
update public.orders set order_number = coalesce(order_number, 'MN-' || substr(id::text,1,8)) where order_number is null;
update public.orders set currency = coalesce(currency,'USD');
update public.orders set subtotal = coalesce(subtotal,0);
update public.orders set shipping_cost = coalesce(shipping_cost,0);
update public.orders set total = coalesce(total,0);
update public.orders set payment_status = coalesce(nullif(payment_status,''),'pending');
update public.orders set design_status = coalesce(nullif(design_status,''),'awaiting_artwork');
update public.orders set printify_status = coalesce(nullif(printify_status,''),'not_sent');

update public.order_items set product_name = coalesce(product_name,'Item');
update public.order_items set quantity = coalesce(quantity,1);
update public.order_items set unit_price = coalesce(unit_price,0);

update public.cart_items set store_id = 'memonuvia' where store_id is null or store_id = '';
update public.cart_items set product_slug = coalesce(product_slug,'');
update public.cart_items set product_name = coalesce(product_name,'');
update public.cart_items set quantity = coalesce(quantity,1);
update public.cart_items set unit_price = coalesce(unit_price,0);
update public.cart_items set currency = coalesce(currency,'USD');

update public.store_settings set default_currency = coalesce(default_currency,'USD');
update public.store_admins set role = coalesce(role,'admin');
update public.store_admins set active = coalesce(active,true);

-- not-null where safe
alter table public.products alter column store_id set default 'memonuvia';
do $$ begin alter table public.products alter column store_id set not null; exception when others then null; end $$;
do $$ begin alter table public.orders alter column store_id set not null; exception when others then null; end $$;
do $$ begin alter table public.designs alter column store_id set not null; exception when others then null; end $$;
do $$ begin alter table public.cart_items alter column store_id set not null; exception when others then null; end $$;
do $$ begin alter table public.customer_uploads alter column store_id set not null; exception when others then null; end $$;
do $$ begin alter table public.product_variants alter column store_id set not null; exception when others then null; end $$;

-- ---------- indexes (ignore conflicts) ----------
do $$ begin alter table public.orders drop constraint if exists orders_order_number_key; exception when others then null; end $$;
do $$ begin alter table public.products drop constraint if exists products_slug_key; exception when others then null; end $$;

create unique index if not exists orders_store_order_number_uidx on public.orders (store_id, order_number);
create unique index if not exists products_store_slug_uidx on public.products (store_id, slug);
create unique index if not exists products_store_printify_uidx on public.products (store_id, printify_product_id) where printify_product_id is not null;
create unique index if not exists designs_store_slug_uidx on public.designs (store_id, slug);
create unique index if not exists designs_store_printify_uidx on public.designs (store_id, printify_product_id) where printify_product_id is not null;
create index if not exists orders_store_created_at_idx on public.orders (store_id, created_at desc);
create index if not exists orders_store_payment_idx on public.orders (store_id, payment_status);
create index if not exists products_store_created_at_idx on public.products (store_id, created_at desc);
create index if not exists cart_items_store_user_idx on public.cart_items (store_id, user_id);
create index if not exists store_admins_store_user_idx on public.store_admins (store_id, user_id);
create index if not exists customer_uploads_store_idx on public.customer_uploads (store_id, created_at desc);
create index if not exists order_items_order_id_idx on public.order_items (order_id);

-- ---------- auth ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''), 'customer')
  on conflict (id) do update set email = excluded.email, updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;

-- ---------- rls ----------
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.designs enable row level security;
alter table public.customer_uploads enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.cart_items enable row level security;
alter table public.store_settings enable row level security;
alter table public.store_admins enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles for select using (auth.uid() = id or public.is_admin());
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles for update using (auth.uid() = id);

drop policy if exists "public read products" on public.products;
create policy "public read products" on public.products for select using (coalesce(active,true) = true or public.is_admin());
drop policy if exists "admin manage products" on public.products;
create policy "admin manage products" on public.products for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read variants" on public.product_variants;
create policy "public read variants" on public.product_variants for select using (true);
drop policy if exists "admin manage variants" on public.product_variants;
create policy "admin manage variants" on public.product_variants for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read designs" on public.designs;
create policy "public read designs" on public.designs for select using (coalesce(active,true) = true or public.is_admin());
drop policy if exists "admin manage designs" on public.designs;
create policy "admin manage designs" on public.designs for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "users manage own uploads" on public.customer_uploads;
create policy "users manage own uploads" on public.customer_uploads for all
  using (auth.uid() = user_id or user_id is null or public.is_admin())
  with check (auth.uid() = user_id or user_id is null or public.is_admin());

drop policy if exists "users read own orders" on public.orders;
create policy "users read own orders" on public.orders for select using (auth.uid() = user_id or public.is_admin());
drop policy if exists "admin manage orders" on public.orders;
create policy "admin manage orders" on public.orders for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "users read own order items" on public.order_items;
create policy "users read own order items" on public.order_items for select using (
  public.is_admin() or exists (select 1 from public.orders o where o.id = order_items.order_id and o.user_id = auth.uid())
);
drop policy if exists "admin manage order items" on public.order_items;
create policy "admin manage order items" on public.order_items for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "users manage own cart items" on public.cart_items;
create policy "users manage own cart items" on public.cart_items for all
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "public read store settings" on public.store_settings;
create policy "public read store settings" on public.store_settings for select using (true);
drop policy if exists "admin manage store settings" on public.store_settings;
create policy "admin manage store settings" on public.store_settings for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "store admins read self" on public.store_admins;
create policy "store admins read self" on public.store_admins for select using (auth.uid() = user_id or public.is_admin());
drop policy if exists "admin manage store_admins" on public.store_admins;
create policy "admin manage store_admins" on public.store_admins for all using (public.is_admin()) with check (public.is_admin());

-- ---------- storage + seed (columns now guaranteed) ----------
insert into storage.buckets (id, name, public)
values ('customer-uploads', 'customer-uploads', false)
on conflict (id) do nothing;

insert into public.store_settings (store_id, site_name, default_currency)
values ('memonuvia', 'MemoNuvia', 'USD')
on conflict (store_id) do update
set site_name = excluded.site_name,
    default_currency = coalesce(public.store_settings.default_currency, excluded.default_currency);

do $$ begin
  alter publication supabase_realtime add table public.orders;
exception when others then null;
end $$;

-- cleanup helper (optional keep)
-- drop function if exists public._mn_add_col(text,text,text);

select 'MemoNuvia schema OK' as status;
