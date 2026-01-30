-- DIAGNOSTIC RPC: Get Active Policies
-- Run this to allow the Assistant to inspect what policies are actually active on the tables.

CREATE OR REPLACE FUNCTION public.get_system_policies()
RETURNS TABLE (
    schema_name text,
    table_name text,
    policy_name text,
    permissive text,
    roles name[],
    cmd text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        schemaname::text,
        tablename::text,
        policyname::text,
        permissive::text,
        roles,
        cmd::text
    FROM pg_policies
    WHERE tablename IN ('inventory_movements', 'materials', 'tickets');
$$;
