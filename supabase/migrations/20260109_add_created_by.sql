-- Add created_by column to requisitions to track the system user who physically created the record
-- distinct from the requester_id (who is the person asking for the material and the first approver)

ALTER TABLE public.requisitions 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Optional: For existing records, assume created_by = requester_id (best guess for historical data)
UPDATE public.requisitions 
SET created_by = requester_id 
WHERE created_by IS NULL;
