-- Migration: Add Employee Number and Update PPE Validation
-- Description: Adds 'employee_number' to tickets and updates the check_ppe_eligibility function to use it.

-- 1. Add 'employee_number' column to tickets
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS employee_number text;

-- 2. Drop the old function if it exists (to avoid signature conflicts)
DROP FUNCTION IF EXISTS public.check_ppe_eligibility(text, uuid[]);
DROP FUNCTION IF EXISTS public.check_ppe_eligibility(text, bigint[]);

-- 3. Create OR Replace the RPC function using Employee Number
CREATE OR REPLACE FUNCTION public.check_ppe_eligibility(
    p_employee_number text,
    p_material_ids bigint[]
)
RETURNS TABLE (
    material_id bigint,
    material_name text,
    last_delivery_date timestamptz,
    renewal_date date,
    ticket_folio bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ti.material_id,
        m.name as material_name,
        t.created_at as last_delivery_date,
        ti.renewal_date,
        t.folio
    FROM public.ticket_items ti
    JOIN public.tickets t ON ti.ticket_id = t.id
    JOIN public.materials m ON ti.material_id = m.id
    WHERE 
        -- Match Employee Number (Exact or Trimmed)
        -- Using simple equality for numbers/codes is safer than ILIKE, but we trim just in case.
        TRIM(t.employee_number) = TRIM(p_employee_number)
        
        -- Match one of the requested materials
        AND ti.material_id = ANY(p_material_ids)
        
        -- Check if it's still valid (Renewal Date is in the future)
        AND ti.renewal_date > CURRENT_DATE
        
    ORDER BY ti.renewal_date DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.check_ppe_eligibility TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_ppe_eligibility TO service_role;

NOTIFY pgrst, 'reload schema';
