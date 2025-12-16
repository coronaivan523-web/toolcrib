-- Fix ticket status column type
-- The column seems to be a strict enum 'ticket_status' which is causing issues.
-- We revert it to 'text' to allow 'pending', 'PENDING', 'PENDIENTE' etc without errors.

DO $$
BEGIN
    -- Check if column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'status') THEN
        
        -- Drop default if it depends on the enum
        ALTER TABLE public.tickets ALTER COLUMN status DROP DEFAULT;

        -- Change type to text
        ALTER TABLE public.tickets ALTER COLUMN status TYPE text USING status::text;

        -- Set new default compatible with text
        ALTER TABLE public.tickets ALTER COLUMN status SET DEFAULT 'pending';
        
    END IF;
END $$;
