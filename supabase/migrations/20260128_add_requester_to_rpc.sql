-- Migration: Add Requester Name to PPE Validation RPC
-- Description: Updates check_ppe_eligibility to return the name of the person who issued the original ticket.

-- Drop old function signature
DROP FUNCTION IF EXISTS public.check_ppe_eligibility(text, bigint[]);

-- Create updated function
CREATE OR REPLACE FUNCTION public.check_ppe_eligibility(
    p_employee_number text,
    p_material_ids bigint[]
)
RETURNS TABLE (
    material_id bigint,
    material_name text,
    last_delivery_date timestamptz,
    renewal_date date,
    ticket_folio bigint,
    requester_name text -- New column
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
        t.folio,
        p.full_name as requester_name
    FROM public.ticket_items ti
    JOIN public.tickets t ON ti.ticket_id = t.id
    JOIN public.materials m ON ti.material_id = m.id
    LEFT JOIN public.profiles p ON t.requester_id = p.id -- Join with profiles to get name
    WHERE 
        TRIM(t.employee_number) = TRIM(p_employee_number)
        AND ti.material_id = ANY(p_material_ids)
        AND ti.renewal_date > CURRENT_DATE
    ORDER BY ti.renewal_date DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_ppe_eligibility TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_ppe_eligibility TO service_role;

NOTIFY pgrst, 'reload schema';
