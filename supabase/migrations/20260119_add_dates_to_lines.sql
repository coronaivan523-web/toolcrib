-- Add date columns to cycle_count_lines to support denormalized reporting
ALTER TABLE cycle_count_lines 
ADD COLUMN IF NOT EXISTS count_date DATE,
ADD COLUMN IF NOT EXISTS planned_date DATE;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload config';
