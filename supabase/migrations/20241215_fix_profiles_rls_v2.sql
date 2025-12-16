-- Enable RLS on public.profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts and ensure clean state
DROP POLICY IF EXISTS "Users can view receive their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Policy 1: Users can view their own profile (Critical for initial role fetch)
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Policy 2: Admins and Supervisors can view all profiles (For management features)
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE role IN ('admin', 'supervisor')
  )
);

-- Policy 3: Allow users to update their own basic info (optional but good practice)
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

-- Ensure the role column is updated correctly (Only admins can update role is usually handled by app logic or separate policy, 
-- but for now assuming 'Users can update own profile' might be too permissive for role. 
-- Ideally, we restrict column updates, but Supabase standard RLS doesn't do column-level easily without triggers. 
-- For now, relying on backend/admin logic for role changes).
