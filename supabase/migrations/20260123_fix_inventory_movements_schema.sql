-- Ensure inventory_movements exists and schema cache is reloaded
-- Re-runnable script

do $$
begin
    if not exists (select from pg_tables where schemaname = 'public' and tablename = 'inventory_movements') then
        -- Create table if missing
        create type public.movement_type as enum ('CYCLE_COUNT', 'REQUISITION', 'RECEIPT', 'ADJUSTMENT');

        create table public.inventory_movements (
            id uuid default gen_random_uuid() primary key,
            material_id bigint references public.materials(id) on delete cascade not null,
            quantity_change integer not null,
            new_stock_level integer not null,
            previous_stock_level integer not null,
            movement_type public.movement_type not null,
            reference_id text,
            reason text,
            created_by uuid references auth.users(id),
            created_at timestamptz default now()
        );

        alter table public.inventory_movements enable row level security;

        create policy "Allow read access for authenticated users"
            on public.inventory_movements for select to authenticated using (true);

        create policy "Allow insert for authenticated users"
            on public.inventory_movements for insert to authenticated with check (true);
    end if;
end
$$;

-- Force Schema Cache Reload for PostgREST
NOTIFY pgrst, 'reload schema';
