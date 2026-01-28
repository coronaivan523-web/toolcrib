-- FIX SCRIPT: Ensure PPE columns exist and reload schema
-- Run this if you see "Could not find the 'operator_name' column" error

DO $$
BEGIN
    -- 1. Ensure 'operator_name' exists in 'tickets'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'operator_name') THEN
        ALTER TABLE public.tickets ADD COLUMN operator_name text;
    END IF;

    -- 2. Ensure 'renewal_date' exists in 'ticket_items'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ticket_items' AND column_name = 'renewal_date') THEN
        ALTER TABLE public.ticket_items ADD COLUMN renewal_date date;
    END IF;

    -- 3. Cleanup: Ensure 'renewal_date' is NOT in 'tickets' (it was moved)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'renewal_date') THEN
        ALTER TABLE public.tickets DROP COLUMN renewal_date;
    END IF;
END $$;

-- 4. Force Schema Cache Reload
NOTIFY pgrst, 'reload schema';
