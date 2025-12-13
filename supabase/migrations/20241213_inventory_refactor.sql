-- Migration: Inventory Refactor & Material Catalog
-- Description: Updates 'materials' table, creates 'material_events', and configures 'material-images' storage.

-- 1. Update 'materials' table
-- We use DO block to add columns if they don't exist to ensure idempotency.
DO $$
BEGIN
    -- Add new columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials' AND column_name = 'material_type') THEN
        ALTER TABLE public.materials ADD COLUMN material_type text; -- 'spare_part' | 'consumable'
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials' AND column_name = 'abc_class') THEN
        ALTER TABLE public.materials ADD COLUMN abc_class text; -- 'A'|'B'|'C'
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials' AND column_name = 'origin_country') THEN
        ALTER TABLE public.materials ADD COLUMN origin_country text; -- 'MX'|'CN'
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials' AND column_name = 'status') THEN
        ALTER TABLE public.materials ADD COLUMN status text DEFAULT 'active';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials' AND column_name = 'image_url') THEN
        ALTER TABLE public.materials ADD COLUMN image_url text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials' AND column_name = 'requested_by') THEN
        ALTER TABLE public.materials ADD COLUMN requested_by uuid REFERENCES auth.users(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials' AND column_name = 'registered_by') THEN
        ALTER TABLE public.materials ADD COLUMN registered_by uuid REFERENCES auth.users(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials' AND column_name = 'deactivated_at') THEN
        ALTER TABLE public.materials ADD COLUMN deactivated_at timestamptz;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials' AND column_name = 'deactivated_by') THEN
        ALTER TABLE public.materials ADD COLUMN deactivated_by uuid REFERENCES auth.users(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials' AND column_name = 'deactivation_reason') THEN
        ALTER TABLE public.materials ADD COLUMN deactivation_reason text;
    END IF;
END $$;

-- 2. Create 'material_events' table
CREATE TABLE IF NOT EXISTS public.material_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    material_id bigint REFERENCES public.materials(id) ON DELETE CASCADE, -- Assuming 'id' in materials is bigint based on current numeric IDs, adjust to uuid if mismatch
    event_type text NOT NULL, -- 'CREATED','UPDATED','DEACTIVATED','REACTIVATED'
    performed_by uuid REFERENCES auth.users(id),
    requested_by uuid REFERENCES auth.users(id),
    notes text,
    created_at timestamptz DEFAULT now()
);

-- 3. Row Level Security (RLS)

-- Enable RLS
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_events ENABLE ROW LEVEL SECURITY;

-- Remove existing policies to avoid conflicts data-loss-safe (drop only policies)
DROP POLICY IF EXISTS "Materials viewable by everyone" ON public.materials;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.materials;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.materials;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.materials;

-- Create Policies for MATERIALS
-- READ: All authenticated users
CREATE POLICY "Enable read access for authenticated users" ON public.materials
    FOR SELECT TO authenticated USING (true);

-- INSERT: All authenticated users (Logic will enforce Registered By)
CREATE POLICY "Enable insert for authenticated users" ON public.materials
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = registered_by OR registered_by IS NULL); -- Allow loose check or strict? Strict is better but frontend must send it.

-- UPDATE: All authenticated users (for now, as per requirements)
CREATE POLICY "Enable update for authenticated users" ON public.materials
    FOR UPDATE TO authenticated USING (true);

-- Create Policies for MATERIAL_EVENTS
-- READ: Authenticated
CREATE POLICY "Enable read access for authenticated users" ON public.material_events
    FOR SELECT TO authenticated USING (true);

-- INSERT: Authenticated
CREATE POLICY "Enable insert for authenticated users" ON public.material_events
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = performed_by);

-- 4. Storage Bucket Setup
-- Attempt to insert if 'storage' schema exists (Standard in Supabase)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
        -- Insert bucket if not exists
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('material-images', 'material-images', false) -- Private bucket
        ON CONFLICT (id) DO NOTHING;

        -- RLS for Storage Objects
        -- Allow authenticated uploads
        CREATE POLICY "Authenticated users can upload material images" ON storage.objects
        FOR INSERT TO authenticated WITH CHECK (bucket_id = 'material-images');

        -- Allow authenticated reads (Since it's private, we might need signed URLs, OR we can allow Public Read via policy even if bucket is private? 
        -- Actually, 'private' bucket means no public URL. We must use .createSignedUrl() or RLS authenticated Select.
        -- Let's allow Authenticated SELECT.
        CREATE POLICY "Authenticated users can view material images" ON storage.objects
        FOR SELECT TO authenticated USING (bucket_id = 'material-images');
    END IF;
END $$;
