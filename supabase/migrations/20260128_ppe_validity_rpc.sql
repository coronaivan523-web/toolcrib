-- Migration: Create PPE Validity Check RPC
-- Description: Function to check if an operator is eligible for renewed PPE based on previous deliveries.

CREATE OR REPLACE FUNCTION public.check_ppe_eligibility(
    p_operator_name text,
    p_material_ids bigint[]
)
RETURNS TABLE (
    material_id bigint,
    material_name text,
    last_delivery_date timestamptz,
    renewal_date date,
    ticket_folio integer
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
        -- Match Operator Name (Case Insensitive & Trimmed)
        TRIM(ILIKE(t.operator_name, TRIM(p_operator_name)))
        
        -- Match one of the requested materials
        AND ti.material_id = ANY(p_material_ids)
        
        -- Check if it's still valid (Renewal Date is in the future)
        AND ti.renewal_date > CURRENT_DATE
        
        -- Exclude cancelled items or rejected tickets if applicable
        -- Assuming 'active' tickets or simple existence. 
        -- If status is important: AND t.status != 'cancelled'
    ORDER BY ti.renewal_date DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_ppe_eligibility TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_ppe_eligibility TO service_role;

NOTIFY pgrst, 'reload schema';
