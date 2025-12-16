-- Add Job Detail columns to ticket_items table
ALTER TABLE public.ticket_items
ADD COLUMN IF NOT EXISTS plant text,
ADD COLUMN IF NOT EXISTS area text,
ADD COLUMN IF NOT EXISTS line_machine text,
ADD COLUMN IF NOT EXISTS process text;

-- Optional: Remove them from tickets table if we want to strictly enforce per-item (keeping for now doesn't hurt, but might be confusing. Let's keep for backward compatibility or general ticket info if needed, but the requirement is per-item).
