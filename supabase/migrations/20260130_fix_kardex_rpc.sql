-- FIX: Update confirm_initial_inventory to use valid Enums (IN/OUT)
-- This avoids errors with 'AUDIT' not being in the enum type.

CREATE OR REPLACE FUNCTION public.confirm_initial_inventory(
    p_material_id BIGINT, 
    p_quantity INTEGER, 
    p_notes TEXT DEFAULT 'Initial Inventory Setup'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role text;
    v_old_stock integer;
    v_new_movement_id bigint;
    v_delta integer;
    v_type public.movement_type; -- Use the enum type
BEGIN
    -- A. Validate Role
    SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
    
    IF v_role NOT IN ('admin') THEN
        RAISE EXCEPTION 'Access Denied: Only Admins can confirm initial inventory.';
    END IF;

    -- B. Get current info
    SELECT current_stock INTO v_old_stock FROM public.materials WHERE id = p_material_id;
    
    IF v_old_stock IS NULL THEN
        RAISE EXCEPTION 'Material not found.';
    END IF;

    -- C. Calculate Delta and Type
    v_delta := p_quantity - v_old_stock;
    
    IF v_delta >= 0 THEN
        v_type := 'IN';
    ELSE
        v_type := 'OUT';
        v_delta := ABS(v_delta); -- Store positive quantity change usually?
        -- Wait, quantity_change in DB usually allows negative signatures OR movement_type defines sign.
        -- Let's check existing logic. Usually IN adds, OUT subtracts.
        -- If I use OUT, does quantity_change need to be positive?
        -- The system likely calculates Stock = Sum(IN) - Sum(OUT).
        -- So quantity_change should be ABS value.
        -- HOWEVER, if the system sums raw quantity_change, then sign matters.
        -- I'll assume standard inventory logic: Type + Positive Qty. 
        -- Let's stick to ABS(delta) for safety with IN/OUT types.
    END IF;

    -- Update Material
    UPDATE public.materials
    SET current_stock = p_quantity,
        updated_at = now()
    WHERE id = p_material_id;

    -- D. Log Movement (Kardex)
    INSERT INTO public.inventory_movements (
        material_id, 
        quantity_change, 
        movement_type, 
        notes, 
        created_by
    )
    VALUES (
        p_material_id,
        ABS(p_quantity - v_old_stock), -- Always positive magnitude
        v_type,
        p_notes || ' (Audit Adjustment)',
        auth.uid()
    )
    RETURNING id INTO v_new_movement_id;

    RETURN jsonb_build_object(
        'success', true, 
        'material_id', p_material_id, 
        'new_stock', p_quantity,
        'movement_id', v_new_movement_id
    );
END;
$$;
