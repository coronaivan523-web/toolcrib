-- Add ticket_id column for human-readable IDs
ALTER TABLE public.cycle_count_sessions ADD COLUMN IF NOT EXISTS ticket_id TEXT;
