-- Migration: Add fields for Requisition V2 (CO-CR-01) and Setup Storage

BEGIN;

-- 1. Add Columns to Profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS job_title TEXT;

-- 2. Add Columns to Requisitions
ALTER TABLE public.requisitions ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.requisitions ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE public.requisitions ADD COLUMN IF NOT EXISTS purchase_justification TEXT;
ALTER TABLE public.requisitions ADD COLUMN IF NOT EXISTS cause TEXT;
ALTER TABLE public.requisitions ADD COLUMN IF NOT EXISTS criticality_requested TEXT;
ALTER TABLE public.requisitions ADD COLUMN IF NOT EXISTS criticality_assigned TEXT;

-- 3. Add Columns to Requisition Items
ALTER TABLE public.requisition_items ADD COLUMN IF NOT EXISTS supplier TEXT;
ALTER TABLE public.requisition_items ADD COLUMN IF NOT EXISTS cost_center TEXT;
ALTER TABLE public.requisition_items ADD COLUMN IF NOT EXISTS project_code TEXT;
ALTER TABLE public.requisition_items ADD COLUMN IF NOT EXISTS monthly_consumption FLOAT;

-- 4. Setup Storage Bucket
-- Note: 'storage' schema must be available. 
INSERT INTO storage.buckets (id, name, public)
VALUES ('requisition-attachments', 'requisition-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage Policies (Simplified for dev, but secure enough: Auth required)
-- Ensure RLS is on for storage.objects (usually is by default)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY; -- Skipped to avoid ownership error


-- Drop existing policies if any to avoid conflicts during re-runs
DROP POLICY IF EXISTS "Auth users can upload req attachments" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can view req attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own req attachments" ON storage.objects;

-- Insert Policy
CREATE POLICY "Auth users can upload req attachments" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'requisition-attachments');

-- Select Policy (Allow read if authenticated - Application logic manages access via Signed URLs or listing visibility)
CREATE POLICY "Auth users can view req attachments" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'requisition-attachments');

-- Delete Policy (Owner only)
CREATE POLICY "Users can delete own req attachments" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'requisition-attachments' AND auth.uid() = owner);

COMMIT;
