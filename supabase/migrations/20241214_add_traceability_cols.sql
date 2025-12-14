-- Migration to add missing traceability columns to materials table

ALTER TABLE public.materials 
ADD COLUMN IF NOT EXISTS registered_by text,
ADD COLUMN IF NOT EXISTS requested_by text;
