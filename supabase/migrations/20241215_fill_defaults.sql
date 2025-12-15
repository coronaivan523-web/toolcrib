-- Backfill empty 'area' and 'process' columns with default values
-- Run this in Supabase SQL Editor

BEGIN;

-- 1. Update empty Areas to 'General'
UPDATE public.materials
SET area = 'General'
WHERE area IS NULL OR area = '';

-- 2. Update empty Processes to 'Standard' (Optional, helps visual consistency)
UPDATE public.materials
SET process = 'Standard'
WHERE process IS NULL OR process = '';

-- 3. Ensure currency has a default if missing
UPDATE public.materials
SET currency = 'MXN'
WHERE currency IS NULL OR currency = '';

COMMIT;

-- Verify changes
SELECT count(*) as updated_records FROM public.materials WHERE area = 'General';
