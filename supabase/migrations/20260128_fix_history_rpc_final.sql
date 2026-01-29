-- Final Fix for History RPC
-- Drops all variations of the function to avoid ambiguity
-- Recreates it with correct signature and robust search logic

-- Drop both potential signatures to ensure clean slate
DROP FUNCTION IF EXISTS public.get_employee_ppe_history(text);
DROP FUNCTION IF EXISTS public.get_employee_ppe_history(text, text);

CREATE OR REPLACE FUNCTION public.get_employee_ppe_history(
    p_employee_number text,
    p_operator_name text DEFAULT NULL
)
RETURNS TABLE (
    id bigint,
    created_at timestamptz,
    ticket_folio bigint,
    requester_name text,
    material_name text,
    part_number text,
    quantity integer,
    renewal_date date,
    ticket_created_at timestamptz,
    is_restock boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ti.id,
        t.created_at as created_at,
        t.folio,
        COALESCE(p.full_name, 'System/Admin') as requester_name,
        m.name,
        m.part_number,
        COALESCE(ti.quantity_fulfilled, ti.quantity_requested) as quantity,
        ti.renewal_date,
        t.created_at as ticket_created_at,
        COALESCE(ti.is_restock, false) as is_restock
    FROM public.ticket_items ti
    JOIN public.tickets t ON ti.ticket_id = t.id
    JOIN public.materials m ON ti.material_id = m.id
    LEFT JOIN public.profiles p ON t.requester_id = p.id
    WHERE 
        (p_employee_number IS NOT NULL AND TRIM(t.employee_number) = TRIM(p_employee_number))
        OR 
        (p_operator_name IS NOT NULL AND t.operator_name ILIKE '%' || TRIM(p_operator_name) || '%')
    ORDER BY t.created_at DESC
    LIMIT 100;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_employee_ppe_history TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_employee_ppe_history TO service_role;

NOTIFY pgrst, 'reload schema';
