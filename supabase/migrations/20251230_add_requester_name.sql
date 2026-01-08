-- Migration: Add requester_name to Requisitions (Fix for incorrect user display)

BEGIN;

ALTER TABLE public.requisitions ADD COLUMN IF NOT EXISTS requester_name TEXT;

COMMIT;
