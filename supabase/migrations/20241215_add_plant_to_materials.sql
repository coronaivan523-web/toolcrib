-- Add plant column to materials table
ALTER TABLE public.materials
ADD COLUMN IF NOT EXISTS plant text;
