-- Script: Change deactivated_by to TEXT
-- Per user request, we want to store the readable user name/email instead of UUID.

ALTER TABLE public.materials DROP CONSTRAINT IF EXISTS materials_deactivated_by_fkey;
ALTER TABLE public.materials ALTER COLUMN deactivated_by TYPE text USING deactivated_by::text;
