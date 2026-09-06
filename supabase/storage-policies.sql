-- Storage bucket + access policies for CMS uploads (photo, CV, project
-- screenshots, skill icons, company icons). Run once in the SQL Editor.
--
-- Creating a bucket and marking it "public" (via the dashboard or the
-- insert below) only grants public READ -- it does NOT grant authenticated
-- users permission to upload/update/delete. Those need explicit policies
-- on storage.objects, which is what this file adds. Safe to re-run.

insert into storage.buckets (id, name, public)
values ('public-assets', 'public-assets', true)
on conflict (id) do update set public = true;

drop policy if exists "public_assets_read" on storage.objects;
create policy "public_assets_read"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'public-assets');

drop policy if exists "public_assets_insert" on storage.objects;
create policy "public_assets_insert"
on storage.objects for insert
to authenticated
with check (bucket_id = 'public-assets');

drop policy if exists "public_assets_update" on storage.objects;
create policy "public_assets_update"
on storage.objects for update
to authenticated
using (bucket_id = 'public-assets')
with check (bucket_id = 'public-assets');

drop policy if exists "public_assets_delete" on storage.objects;
create policy "public_assets_delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'public-assets');
