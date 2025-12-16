-- Migration: Set user 'ivan.corona' as admin
-- Created at: 2024-12-15 14:35:00

-- Update based on email pattern or full name
UPDATE public.profiles
SET role = 'admin'
WHERE email ILIKE 'ivan.corona%' OR full_name ILIKE 'Ivan Corona';

-- Remove any other admins (keep only ivan.corona as admin)
DELETE FROM public.profiles 
WHERE role = 'admin' 
  AND email NOT ILIKE 'ivan.corona%' 
  AND full_name NOT ILIKE 'Ivan Corona';

-- Notify schema reload just in case
NOTIFY pgrst, 'reload schema';
