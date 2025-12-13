-- Add machine_asset column to materials table
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS machine_asset text;
