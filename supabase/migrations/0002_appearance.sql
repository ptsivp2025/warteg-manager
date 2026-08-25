-- ============================================================
-- APPEARANCE: logo & theme color per warung + storage bucket
-- ============================================================

alter table public.warungs
  add column if not exists logo_url text,
  add column if not exists theme_color text not null default '#0f7a4d';

-- ------------------------------------------------------------
-- STORAGE BUCKET for warung logos (public read, scoped write)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('warung-assets', 'warung-assets', true)
on conflict (id) do nothing;

-- Anyone can view logos (public bucket, needed to render <img> without auth)
drop policy if exists "warung_assets_public_read" on storage.objects;
create policy "warung_assets_public_read" on storage.objects
  for select using (bucket_id = 'warung-assets');

-- Members can upload/replace/delete files ONLY inside a folder named
-- after a warung_id they belong to, e.g. "<warung_id>/logo.png"
drop policy if exists "warung_assets_member_write" on storage.objects;
create policy "warung_assets_member_write" on storage.objects
  for insert with check (
    bucket_id = 'warung-assets'
    and public.is_warung_member(( (storage.foldername(name))[1] )::uuid)
  );

drop policy if exists "warung_assets_member_update" on storage.objects;
create policy "warung_assets_member_update" on storage.objects
  for update using (
    bucket_id = 'warung-assets'
    and public.is_warung_member(( (storage.foldername(name))[1] )::uuid)
  );

drop policy if exists "warung_assets_member_delete" on storage.objects;
create policy "warung_assets_member_delete" on storage.objects
  for delete using (
    bucket_id = 'warung-assets'
    and public.is_warung_member(( (storage.foldername(name))[1] )::uuid)
  );
