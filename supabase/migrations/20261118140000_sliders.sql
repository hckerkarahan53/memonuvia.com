-- Align with shared multi-tenant public.sliders schema (CaseNuvia + MemoNuvia).
-- Existing columns: slug, tab_label, eyebrow, headline, image_url, image_path,
-- alt_text, cta_label, cta_href, order_index, is_active

create table if not exists public.sliders (
  id uuid primary key default gen_random_uuid(),
  store_id text not null,
  slug text,
  tab_label text,
  eyebrow text,
  headline text not null default '',
  image_url text not null,
  image_path text,
  alt_text text,
  cta_label text,
  cta_href text,
  order_index integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Defensive adds if an older/partial table exists
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='sliders' and column_name='slug') then
    alter table public.sliders add column slug text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='sliders' and column_name='tab_label') then
    alter table public.sliders add column tab_label text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='sliders' and column_name='eyebrow') then
    alter table public.sliders add column eyebrow text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='sliders' and column_name='headline') then
    alter table public.sliders add column headline text not null default '';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='sliders' and column_name='image_url') then
    alter table public.sliders add column image_url text not null default '';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='sliders' and column_name='image_path') then
    alter table public.sliders add column image_path text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='sliders' and column_name='alt_text') then
    alter table public.sliders add column alt_text text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='sliders' and column_name='cta_label') then
    alter table public.sliders add column cta_label text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='sliders' and column_name='cta_href') then
    alter table public.sliders add column cta_href text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='sliders' and column_name='order_index') then
    alter table public.sliders add column order_index integer not null default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='sliders' and column_name='is_active') then
    alter table public.sliders add column is_active boolean not null default true;
  end if;
end $$;

create index if not exists sliders_store_sort_idx
  on public.sliders (store_id, order_index, is_active);

alter table public.sliders enable row level security;

drop policy if exists "public read active sliders" on public.sliders;
create policy "public read active sliders"
  on public.sliders for select
  using (is_active = true);

drop policy if exists "admin manage sliders" on public.sliders;
create policy "admin manage sliders"
  on public.sliders for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.role = 'admin' or coalesce(p.is_admin, false) = true)
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.role = 'admin' or coalesce(p.is_admin, false) = true)
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sliders', 'sliders', true, 5242880,
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif'];

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'products', 'products', true, 5242880,
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif'];

-- Seed MemoNuvia homepage heroes (idempotent by store_id + image_url)
insert into public.sliders (
  store_id, slug, tab_label, eyebrow, headline, image_url, alt_text, cta_label, cta_href, order_index, is_active
)
select v.store_id, v.slug, v.tab_label, v.eyebrow, v.headline, v.image_url, v.alt_text, v.cta_label, v.cta_href, v.order_index, v.is_active
from (values
  ('memonuvia', 'family', 'Family', 'MemoNuvia.com', 'Your family. Your forever keepsake.', '/images/hero-anderson-slate.jpg', 'Anderson Family personalized photo slate', 'Create Your Family Slate →', '/shop?category=family', 1, true),
  ('memonuvia', 'couples', 'Couples', 'MemoNuvia.com', 'Your love, beautifully remembered.', '/images/hero-emily-james-slate.jpg', 'Emily & James personalized photo slate', 'Create Your Couple Slate →', '/shop?category=couples', 2, true),
  ('memonuvia', 'pets', 'Pets', 'MemoNuvia.com', 'Little paws. A big place in your heart.', '/images/hero-pets-luna-cooper.jpg', 'Luna and Cooper personalized pet photo slates', 'Create Your Pet Slate →', '/shop?category=pets', 3, true),
  ('memonuvia', 'kids', 'Kids', 'MemoNuvia.com', 'Their smile. A little everyday magic.', '/images/hero-kids-sophia-oliver.jpg', 'Sophia and Oliver personalized kids photo slates', 'Create Their Slate →', '/shop?category=kids', 4, true),
  ('memonuvia', 'portraits', 'Portraits', 'MemoNuvia.com', 'A keepsake as unique as you.', '/images/hero-portraits-charlotte-james.jpg', 'Charlotte and James personalized portrait photo slates', 'Create Your Photo Slate →', '/shop?category=portraits', 5, true)
) as v(store_id, slug, tab_label, eyebrow, headline, image_url, alt_text, cta_label, cta_href, order_index, is_active)
where not exists (
  select 1 from public.sliders s
  where s.store_id = v.store_id and s.image_url = v.image_url
);
