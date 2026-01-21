-- Add planned_date to cycle_count_lines
ALTER TABLE cycle_count_lines 
ADD COLUMN IF NOT EXISTS planned_date TIMESTAMP WITH TIME ZONE;
