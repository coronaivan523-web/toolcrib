-- Supabase Migration: 20260302_atomic_inventory_movement_v1.sql
-- Description: HC-2 Atomic Inventory Movement Pattern

CREATE OR REPLACE FUNCTION atomic_inventory_movement_v1(
    p_material_id bigint,
    p_delta integer,
    p_user_id uuid,
    p_reason text
)
RETURNS TABLE(new_stock integer)
LANGUAGE plpgsql
AS $$
DECLARE
    v_new_stock integer;
    v_plant text;
BEGIN
    UPDATE materials
    SET current_stock = current_stock + p_delta
    WHERE id = p_material_id
    RETURNING current_stock, plant INTO v_new_stock, v_plant;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Material not found';
    END IF;

    IF v_new_stock < 0 THEN
        RAISE EXCEPTION 'Insufficient stock';
    END IF;

    -- Map API terms to columns
    -- delta -> quantity
    -- reason -> notes
    -- We assume the system handles MovementType Enum IN/OUT in the caller or we can deduce it
    -- For this purely atomic delta-based proxy, we infer type:
    
    INSERT INTO inventory_movements(
        material_id,
        quantity,
        movement_type,
        user_id,
        notes,
        plant,
        created_at
    )
    VALUES (
        p_material_id,
        ABS(p_delta), -- quantity is usually absolute
        CASE WHEN p_delta >= 0 THEN 'IN' ELSE 'OUT' END, -- infer movement_type
        p_user_id,
        p_reason,
        v_plant,
        now()
    );

    RETURN QUERY SELECT v_new_stock;
END;
$$;
