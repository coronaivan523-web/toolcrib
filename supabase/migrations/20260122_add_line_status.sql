-- Add status column to cycle_count_lines
ALTER TABLE public.cycle_count_lines ADD COLUMN IF NOT EXISTS status text DEFAULT 'PENDING';

-- Update existing lines: If qty_physical is not null, set to 'COUNTED' (optional but good for consistency)
UPDATE public.cycle_count_lines SET status = 'COUNTED' WHERE qty_physical IS NOT NULL AND status = 'PENDING';

NOTIFY pgrst, 'reload schema';
