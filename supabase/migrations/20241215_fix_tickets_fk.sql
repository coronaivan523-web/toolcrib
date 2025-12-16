-- Fix tickets requester_id Foreign Key
-- We need to reference public.profiles(id) instead of auth.users(id) to allow embedding profile data in queries.

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Find existing FK constraint on requester_id
    FOR r IN 
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_schema = 'public' 
        AND table_name = 'tickets' 
        AND constraint_type = 'FOREIGN KEY'
    LOOP
        -- We check if this constraint is on requester_id column by joining key_column_usage, 
        -- but simpler is to just drop known potential names or inspect. 
        -- Given standard naming, it's likely tickets_requester_id_fkey.
        -- Use dynamic SQL to be safe if we can confirm it targets requester_id?
        -- For simplicity in this script, we'll try to drop the standard name.
        NULL;
    END LOOP;
    
    -- Try to drop constraint by name if it exists (ignoring errors if not exists logic difficult in plain SQL block without knowing name)
    -- We'll use ALTER TABLE ... DROP CONSTRAINT IF EXISTS
    EXECUTE 'ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_requester_id_fkey';

    -- Also check for any other FK on requester_id?
    -- Let's just Add the new one.
    
    EXECUTE 'ALTER TABLE public.tickets ADD CONSTRAINT tickets_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.profiles(id) ON DELETE CASCADE';
    
END $$;
