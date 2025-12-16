-- Add Job details columns to tickets table
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS area text,
ADD COLUMN IF NOT EXISTS line_machine text,
ADD COLUMN IF NOT EXISTS process text;

-- Optional: Verify policies if needed. The existing policies on 'tickets' allow INSERT with requester_id check.
-- We might need to ensure the new columns are readable/writable.
-- Since previous policies used 'true' for USING/CHECK (except INSERT requester_id), it should be fine.
-- But let's verify INSERT policy accepts new columns implicitly.
-- The existing policy: FOR INSERT TO authenticated WITH CHECK (auth.uid() = requester_id); 
-- This only enforces requester_id matches, doesn't restrict other columns.
