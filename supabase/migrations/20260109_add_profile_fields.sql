-- Add department and position columns to profiles table

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS department text,
ADD COLUMN IF NOT EXISTS position text;

-- Notify pgrst to reload schema
NOTIFY pgrst, 'reload schema';
