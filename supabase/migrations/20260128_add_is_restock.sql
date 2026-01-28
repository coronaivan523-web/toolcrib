-- Migration: Add is_restock column to ticket_items
-- Purpose: Track when an item is re-issued/restocked (bypassing blocking) for audit/charging purposes.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ticket_items' AND column_name = 'is_restock') THEN
        ALTER TABLE public.ticket_items ADD COLUMN is_restock BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
