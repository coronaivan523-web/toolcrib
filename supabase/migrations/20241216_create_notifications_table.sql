-- Create notifications table
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  type text not null, -- 'low_stock', 'approval_request', etc
  message text not null,
  status text default 'unread'::text, -- 'unread', 'read', 'archived'
  sender_id uuid references auth.users(id),
  material_id bigint, -- Optional link to material (loose reference or FK if compatible)
  recipient_role text -- 'admin', 'supervisor', 'tool_crib'
);

-- Enable RLS
alter table public.notifications enable row level security;

-- Policies
create policy "Enable read access for all authenticated users"
on public.notifications for select
to authenticated
using (true);

create policy "Enable insert for authenticated users"
on public.notifications for insert
to authenticated
with check (true);

create policy "Enable update for authenticated users"
on public.notifications for update
to authenticated
using (true);
