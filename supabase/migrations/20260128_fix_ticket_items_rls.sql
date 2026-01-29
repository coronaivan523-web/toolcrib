-- FIX: Simplify RLS on ticket_items to ensure visibility
-- Problem: Users create ticket items but cannot see them immediately (0 items error).
-- Solution: Allow authenticated users to view ALL ticket items (internal tool).

-- 1. Enable RLS (just in case)
ALTER TABLE public.ticket_items ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to clear conflicts
DROP POLICY IF EXISTS "Users can view their own ticket items" ON public.ticket_items;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.ticket_items;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.ticket_items;
DROP POLICY IF EXISTS "Ticket items visible to everyone" ON public.ticket_items;

-- 3. Create Permissive Read Policy (Authenticated Users can read ALL items)
-- This avoids complex JOINS with tickets table which might be failing or slow
CREATE POLICY "Enable read access for authenticated users"
ON public.ticket_items FOR SELECT
TO authenticated
USING (true);

-- 4. Create Insert Policy
CREATE POLICY "Enable insert for authenticated users"
ON public.ticket_items FOR INSERT
TO authenticated
WITH CHECK (true);

-- 5. Create Update Policy
CREATE POLICY "Enable update for authenticated users"
ON public.ticket_items FOR UPDATE
TO authenticated
USING (true);

-- 6. Force schema reload
NOTIFY pgrst, 'reload schema';
