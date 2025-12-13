-- Script: Add 'requested_by_position' column
-- Stores the job position of the requestor.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials' AND column_name = 'requested_by_position') THEN
        ALTER TABLE public.materials ADD COLUMN requested_by_position text;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
