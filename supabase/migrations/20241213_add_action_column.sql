-- Add action_type column to materials table
-- Values should be 'Alta' or 'Modificación'
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS action_type text;

-- Optional: Set default for existing records
-- UPDATE public.materials SET action_type = 'Alta' WHERE action_type IS NULL;
