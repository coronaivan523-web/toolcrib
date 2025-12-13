-- Migration: Change requested_by to text
-- Description: Allows free text entry for 'Requested By' instead of strict Foreign Key to auth.users.

-- 1. Drop Foreign Key Constraint
-- We need to find the constraint name. Usually it is materials_requested_by_fkey or auto-generated.
-- We'll accept that we might need to drop it carefully.
ALTER TABLE public.materials DROP CONSTRAINT IF EXISTS materials_requested_by_fkey;

-- 2. Change Column Type
-- UUID to TEXT is a valid cast.
ALTER TABLE public.materials ALTER COLUMN requested_by TYPE text USING requested_by::text;

-- Update audit table if strictly related? No, material_events.requested_by might also need this if it copies it?
-- The requirements for 'material_events' said: "requested_by (uuid) references auth.users".
-- If we change the material's requested_by to text, the event logs might still want to track a system user IF available, 
-- or maybe we should relax that too? 
-- Let's relax materials table first as requested.
