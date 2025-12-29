-- Ensure 'public.profiles' allows read access for all authenticated users
-- This is a fallback/safety measure ensuring that even without Admin privileges, 
-- users can at least attempt to read profiles (though RLS might still filter rows if not careful).
-- The backend now uses Service Key, so this is less critical but good for consistency.

BEGIN;

-- 1. Enable RLS (just in case)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Create a broad read policy if it doesn't exist
-- We drop it first to ensure we can update the definition if needed
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.profiles;

CREATE POLICY "Allow read access for authenticated users"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

COMMIT;
