-- Script: Change 'location' to TEXT (Free input)
-- User wants to write location manually.
-- We will add a 'location' text column, migrate existing data from 'locations' table if possible, and remove the strict FK dependency.

DO $$
BEGIN
    -- 1. Add 'location' text column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials' AND column_name = 'location') THEN
        ALTER TABLE public.materials ADD COLUMN location text;
        
        -- 2. Migrate existing data (Best effort)
        -- Assuming 'locations' table has 'id' and 'code'
        -- We try to copy the code to the new location column
        -- We need dynamic SQL or direct update if we are sure tables exist.
        -- Let's assume standard joins work.
        UPDATE public.materials m
        SET location = l.code
        FROM public.locations l
        WHERE m.location_id = l.id;
    END IF;

    -- 3. Drop FK constraint if exists to allow free text (optional, but good for cleanup)
    -- We won't drop the column 'location_id' yet to prevent data loss if migration fails, 
    -- but we will stop using it in the app.
    -- ALTER TABLE public.materials DROP CONSTRAINT IF EXISTS materials_location_id_fkey;

END $$;

-- 4. Reload Schema
NOTIFY pgrst, 'reload schema';
