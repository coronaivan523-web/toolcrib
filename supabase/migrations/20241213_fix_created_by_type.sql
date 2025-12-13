-- Change created_by to TEXT to support Email/Name
ALTER TABLE public.materials ALTER COLUMN created_by TYPE text;

-- Optional: Clear existing UUID values if they are just duplicates of registered_by
-- UPDATE public.materials SET created_by = NULL WHERE created_by = registered_by::text;
