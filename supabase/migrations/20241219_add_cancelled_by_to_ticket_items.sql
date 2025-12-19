-- Migration: Add cancelled_by and cancelled_at to ticket_items
-- Description: Tracks who cancelled an item and when.
-- References public.profiles to allow easy PostgREST joins.

ALTER TABLE public.ticket_items
ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
