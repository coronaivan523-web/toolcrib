-- Fix RLS Infinite Recursion on Profiles
-- The issue is that checking 'is admin' by querying public.profiles causes a loop because public.profiles is protected by the same policy.
-- Solution: Create a SECURITY DEFINER function to check the role without triggering RLS.

CREATE OR REPLACE FUNCTION public.is_admin_or_supervisor()
RETURNS BOOLEAN AS $$
DECLARE
  _role text;
BEGIN
  -- Select role directly. SECURITY DEFINER ensures this bypasses RLS.
  SELECT role INTO _role
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN _role IN ('admin', 'supervisor');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the policy to use the secure function
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (
  public.is_admin_or_supervisor()
);

-- Note: "Users can view own profile" policy usually remains as is: auth.uid() = id
