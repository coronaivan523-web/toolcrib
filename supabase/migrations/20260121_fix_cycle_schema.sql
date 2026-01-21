
-- Add ticket_id to cycle_count_sessions if not exists
alter table public.cycle_count_sessions 
add column if not exists ticket_id text;

-- Add RLS policy for insert if not exists
drop policy if exists "Users can insert sessions" on public.cycle_count_sessions;
create policy "Users can insert sessions" on public.cycle_count_sessions
  for insert with check (auth.uid() = created_by);

-- Allow all for now for debugging if needed, but the above is standard.
-- Also check update/select policies
drop policy if exists "Enable read access for authenticated users" on public.cycle_count_sessions;
create policy "Enable read access for authenticated users" on public.cycle_count_sessions
  for select using (true);

drop policy if exists "Enable update for users" on public.cycle_count_sessions;
create policy "Enable update for users" on public.cycle_count_sessions
  for update using (true);
