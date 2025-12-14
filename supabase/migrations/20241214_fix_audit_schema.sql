-- FIX SCRIPT: Audit Trail Schema & Policies
-- Run this in your Supabase SQL Editor to ensure the Audit feature works correctly.

-- 1. Ensure table exists
create table if not exists public.material_events (
    id uuid default uuid_generate_v4() primary key,
    material_id uuid references public.materials(id) on delete cascade not null,
    event_type text not null,
    performed_by uuid references public.profiles(id),
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Add columns if they don't exist
do $$ 
begin
    -- Common fields
    if not exists (select 1 from information_schema.columns where table_name = 'material_events' and column_name = 'modifier_name') then
        alter table public.material_events add column modifier_name text;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'material_events' and column_name = 'modifier_position') then
        alter table public.material_events add column modifier_position text;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'material_events' and column_name = 'modifier_area') then
        alter table public.material_events add column modifier_area text;
    end if;
    -- Authorization fields
    if not exists (select 1 from information_schema.columns where table_name = 'material_events' and column_name = 'chinese_auth') then
        alter table public.material_events add column chinese_auth boolean default false;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'material_events' and column_name = 'chinese_authorizer') then
        alter table public.material_events add column chinese_authorizer text;
    end if;
    -- Evidence fields
    if not exists (select 1 from information_schema.columns where table_name = 'material_events' and column_name = 'evidence_image_path') then
        alter table public.material_events add column evidence_image_path text;
    end if;
end $$;

-- 3. Reset RLS Policies (Safest way to clear generic/restrictive defaults)
alter table public.material_events enable row level security;

-- Drop old policies to avoid conflicts
drop policy if exists "Material events are viewable by everyone" on public.material_events;
drop policy if exists "Authenticated users can insert material events" on public.material_events;

-- Re-create Policies
create policy "Material events are viewable by everyone" 
on public.material_events for select using (true);

create policy "Authenticated users can insert material events" 
on public.material_events for insert with check (auth.role() = 'authenticated');

-- 4. Create Storage Bucket for Evidence (if not exists)
insert into storage.buckets (id, name, public)
values ('audit-evidence', 'audit-evidence', true)
on conflict (id) do nothing;

-- 5. Storage Policies
create policy "Evidence Images are publicly accessible"
on storage.objects for select
using ( bucket_id = 'audit-evidence' );

create policy "Authenticated users can upload evidence"
on storage.objects for insert
with check ( bucket_id = 'audit-evidence' and auth.role() = 'authenticated' );
