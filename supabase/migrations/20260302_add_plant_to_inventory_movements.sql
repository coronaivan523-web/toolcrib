-- Supabase Migration: 20260302_add_plant_to_inventory_movements.sql
-- Description: HC-3 Fase 2 Multi-Planta Structuring

-- 1) Agregar columna
ALTER TABLE public.inventory_movements
ADD COLUMN IF NOT EXISTS plant text;

-- 2) Backfill NO destructivo
UPDATE public.inventory_movements im
SET plant = m.plant
FROM public.materials m
WHERE im.material_id = m.id
  AND im.plant IS NULL;

-- 3) Constraint (Aplicar en Staging manualmente tras verificar null_plants)
-- NOTA: Se deja comentado por seguridad. 
-- Ejecutar en consola PSQL o Supabase UI solo si el check "SELECT COUNT(*) FROM inventory_movements WHERE plant IS NULL;" es cero.
-- ALTER TABLE public.inventory_movements ALTER COLUMN plant SET NOT NULL;

-- 4) Actualizar RPC confirm_initial_inventory para derivar planta
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
    v_type public.movement_type;
    v_plant text;
BEGIN
    SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
    
    IF v_role NOT IN ('admin') THEN
        RAISE EXCEPTION 'Access Denied: Only Admins can confirm initial inventory.';
    END IF;

    SELECT current_stock, plant INTO v_old_stock, v_plant FROM public.materials WHERE id = p_material_id;
    
    IF v_old_stock IS NULL THEN
        RAISE EXCEPTION 'Material not found.';
    END IF;

    v_delta := p_quantity - v_old_stock;
    
    IF v_delta >= 0 THEN
        v_type := 'IN';
    ELSE
        v_type := 'OUT';
    END IF;

    UPDATE public.materials
    SET current_stock = p_quantity,
        updated_at = now()
    WHERE id = p_material_id;

    INSERT INTO public.inventory_movements (
        material_id, 
        quantity_change, 
        movement_type, 
        notes, 
        plant,
        created_by
    )
    VALUES (
        p_material_id,
        ABS(p_quantity - v_old_stock), 
        v_type,
        p_notes || ' (Audit Adjustment)',
        v_plant,
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
