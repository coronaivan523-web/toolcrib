-- Create material_events table for audit trail
create table if not exists public.material_events (
    id uuid default uuid_generate_v4() primary key,
    material_id uuid references public.materials(id) on delete cascade not null,
    event_type text not null, -- 'CREATED', 'UPDATED', 'DEACTIVATED', 'REACTIVATED', 'LIMIT_UPDATE'
    performed_by uuid references public.profiles(id), -- Link to profiles to get email/name
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.material_events enable row level security;

-- Policies
create policy "Material events are viewable by everyone" 
on public.material_events for select using (true);

create policy "Authenticated users can insert material events" 
on public.material_events for insert with check (auth.role() = 'authenticated');
