-- Update the profile name for the admin user
-- Run this AFTER changing the email in the dashboard

UPDATE public.profiles
SET full_name = 'Ivan Corona',
    email = 'ivan.corona@wasion.cn'
WHERE role = 'admin';  -- This will target the old admin we are renaming
