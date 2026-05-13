create table if not exists public.site_content (
  id text primary key,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.site_content enable row level security;

drop policy if exists "Public can read published site content" on public.site_content;
create policy "Public can read published site content"
on public.site_content
for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated users can manage site content" on public.site_content;
drop policy if exists "CMS editors can manage site content" on public.site_content;
create policy "CMS editors can manage site content"
on public.site_content
for all
to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'cms_editor')
with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'cms_editor');

insert into public.site_content (id, content)
values ('visual-page', '{}'::jsonb)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('cms-images', 'cms-images', true)
on conflict (id) do nothing;

drop policy if exists "Public can read CMS images" on storage.objects;
create policy "Public can read CMS images"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'cms-images');

drop policy if exists "Authenticated users can upload CMS images" on storage.objects;
drop policy if exists "CMS editors can upload CMS images" on storage.objects;
create policy "CMS editors can upload CMS images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'cms-images'
  and (auth.jwt() -> 'app_metadata' ->> 'role') = 'cms_editor'
);

drop policy if exists "Authenticated users can update CMS images" on storage.objects;
drop policy if exists "CMS editors can update CMS images" on storage.objects;
create policy "CMS editors can update CMS images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'cms-images'
  and (auth.jwt() -> 'app_metadata' ->> 'role') = 'cms_editor'
)
with check (
  bucket_id = 'cms-images'
  and (auth.jwt() -> 'app_metadata' ->> 'role') = 'cms_editor'
);

drop policy if exists "Authenticated users can delete CMS images" on storage.objects;
drop policy if exists "CMS editors can delete CMS images" on storage.objects;
create policy "CMS editors can delete CMS images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'cms-images'
  and (auth.jwt() -> 'app_metadata' ->> 'role') = 'cms_editor'
);
