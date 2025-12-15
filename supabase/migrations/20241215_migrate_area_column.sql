-- Migration Plan: Consolidate 'Area' and 'area' columns
-- Run this in Supabase SQL Editor

BEGIN;

-- 1. Copy data from "Area" (mixed case column) to "area" (lowercase column)
--    We use double quotes for "Area" to handle case sensitivity if it exists.
--    We handle the case where "Area" might not exist by catching exception or just updating if it does.

-- Attempt to update 'area' from 'Area' where 'area' is empty/default and 'Area' has value
-- Check if column "Area" exists dynamically is hard in simple SQL script without procedural code, 
-- but given the symptoms, we assume it exists.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'materials' 
        AND column_name = 'Area'
    ) THEN
        -- Column "Area" exists, migrate data
        UPDATE public.materials
        SET area = "Area"
        WHERE (area IS NULL OR area = '' OR area = 'General') 
          AND ("Area" IS NOT NULL AND "Area" <> '');
          
        -- Rename old column to avoid confusion (or drop it later)
        ALTER TABLE public.materials RENAME COLUMN "Area" TO "area_deprecated";
    END IF;
END $$;

COMMIT;

-- Verify
SELECT count(*) as migrated_count FROM public.materials WHERE area_deprecated IS NOT NULL;
