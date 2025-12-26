-- Fix Requisitions Requester Foreign Key
-- Problem: PostgREST cannot embedded public.profiles because FK points to auth.users
-- Solution: Point FK to public.profiles (which mirrors auth.users)

BEGIN;

-- 1. Drop old constraint (if it exists, using standard naming or trying multiple names)
ALTER TABLE public.requisitions DROP CONSTRAINT IF EXISTS requisitions_requester_id_fkey;

-- 2. Add new constraint pointing to public.profiles
ALTER TABLE public.requisitions 
    ADD CONSTRAINT requisitions_requester_id_fkey 
    FOREIGN KEY (requester_id) 
    REFERENCES public.profiles(id);

-- 3. Reload Schema Cache
NOTIFY pgrst, 'reload schema';

COMMIT;
