-- Migration: Move renewal_date to ticket_items (Correction)
-- Description: renewal_date must be per-item, not per-ticket.

-- 1. Remove column from tickets (if it exists from previous step)
ALTER TABLE public.tickets 
DROP COLUMN IF EXISTS renewal_date;

-- 2. Add column to ticket_items
ALTER TABLE public.ticket_items 
ADD COLUMN IF NOT EXISTS renewal_date date;

-- 3. Notify schema reload
NOTIFY pgrst, 'reload schema';
