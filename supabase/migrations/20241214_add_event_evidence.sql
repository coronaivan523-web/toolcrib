-- Add columns for detailed audit evidence
alter table public.material_events 
add column if not exists chinese_authorizer_name text,
add column if not exists evidence_image_path text;

-- Create storage bucket for audit evidence if it doesn't exist
insert into storage.buckets (id, name, public)
values ('audit-evidence', 'audit-evidence', true)
on conflict (id) do nothing;

-- Storage Policies
-- 1. Allow public read access to the bucket
create policy "Public Access Evidence"
on storage.objects for select
using ( bucket_id = 'audit-evidence' );

-- 2. Allow authenticated users to upload
create policy "Authenticated Upload Evidence"
on storage.objects for insert
with check ( bucket_id = 'audit-evidence' and auth.role() = 'authenticated' );
