-- All-in-one fix for missing columns in Stock view (Updated with Currency)
-- Run this in Supabase SQL Editor

DO $$
BEGIN
    -- 1. Ensure 'process' column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials' AND column_name = 'process') THEN
        ALTER TABLE public.materials ADD COLUMN process text;
    END IF;

    -- 2. Ensure 'area' column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials' AND column_name = 'area') THEN
        ALTER TABLE public.materials ADD COLUMN area text;
    END IF;

    -- 3. Ensure 'machine_asset' column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials' AND column_name = 'machine_asset') THEN
        ALTER TABLE public.materials ADD COLUMN machine_asset text;
    END IF;

    -- 4. Ensure 'cost_center' column exists 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials' AND column_name = 'cost_center') THEN
        ALTER TABLE public.materials ADD COLUMN cost_center text;
    END IF;

    -- 5. Ensure 'unit_cost' column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials' AND column_name = 'unit_cost') THEN
        ALTER TABLE public.materials ADD COLUMN unit_cost numeric(10,2) DEFAULT 0.00;
    END IF;

    -- 6. Ensure 'currency' column exists (NEW)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials' AND column_name = 'currency') THEN
        ALTER TABLE public.materials ADD COLUMN currency text DEFAULT 'MXN';
    END IF;

    -- 7. Ensure 'origin_country' column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials' AND column_name = 'origin_country') THEN
        ALTER TABLE public.materials ADD COLUMN origin_country text;
    END IF;

    -- 8. Ensure 'abc_class' column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials' AND column_name = 'abc_class') THEN
        ALTER TABLE public.materials ADD COLUMN abc_class text;
    END IF;

    -- 9. Ensure 'has_requisition' column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials' AND column_name = 'has_requisition') THEN
        ALTER TABLE public.materials ADD COLUMN has_requisition boolean DEFAULT false;
    END IF;

END $$;

-- Force schema reload
NOTIFY pgrst, 'reload schema';
