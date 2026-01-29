-- RETRY MIGRATION: Ensure PPE Control Columns Exist
-- Description: Re-runs the column additions safely. Run this in Supabase SQL Editor.

-- 1. Update 'materials' table
ALTER TABLE public.materials 
ADD COLUMN IF NOT EXISTS is_ppe boolean DEFAULT false;

-- 2. Update 'tickets' table
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS operator_name text;

ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS employee_number text;

ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS is_ppe_ticket boolean DEFAULT false;

ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS renewal_date date;

-- 3. Notify schema reload
NOTIFY pgrst, 'reload schema';
