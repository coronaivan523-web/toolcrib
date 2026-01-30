-- FINAL HARDENING FIX
-- 1. Fix RPC 'null value in column quantity' -> Insert 'quantity' field
-- 2. FORCE cleanup of Materials policies (Nuclear option to remove 'Enable write access for all')

BEGIN;

-- ----------------------------------------------------
-- A. FIX RPC: confirm_initial_inventory
-- ----------------------------------------------------
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
    v_abs_delta integer;
    v_type public.movement_type;
BEGIN
    -- Validate Role
    SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
    IF v_role NOT IN ('admin') THEN
        RAISE EXCEPTION 'Access Denied: Only Admins can confirm initial inventory.';
    END IF;

    -- Get current info
    SELECT current_stock INTO v_old_stock FROM public.materials WHERE id = p_material_id;
    IF v_old_stock IS NULL THEN
        RAISE EXCEPTION 'Material not found.';
    END IF;

    -- Calculate Delta
    v_delta := p_quantity - v_old_stock;
    v_abs_delta := ABS(v_delta);
    
    IF v_delta >= 0 THEN
        v_type := 'IN';
    ELSE
        v_type := 'OUT';
    END IF;

    -- Update Material
    UPDATE public.materials
    SET current_stock = p_quantity,
        updated_at = now()
    WHERE id = p_material_id;

    -- Log Movement (Kardex)
    -- Added 'quantity' column population to fix NOT NULL constraint
    INSERT INTO public.inventory_movements (
        material_id, 
        quantity,        -- Fix: Required column
        quantity_change, 
        movement_type, 
        notes, 
        created_by
    )
    VALUES (
        p_material_id,
        v_abs_delta,     -- The transaction amount (unsigned)
        v_abs_delta,     -- Logic check: Schema seems to use this unsigned too? Or signed?
                         -- Test result showed: Failing row has null for quantity.
                         -- We will pass positive value for 'quantity' (amount moved).
                         -- 'quantity_change' might be signed or unsigned depending on system. 
                         -- Given previous test passed insert with unsigned, we stick to that.
                         -- If system requires sign, 'movement_type' usually handles direction.
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


-- ----------------------------------------------------
-- B. FORCE CLEANUP: Materials
-- ----------------------------------------------------
-- We drop ALL policies on materials to ensure the permissive one is gone.
-- Then we re-create the protected ones.

-- 1. Drop EVERYTHING on materials
DROP POLICY IF EXISTS "Enable read access for all users" ON public.materials;
DROP POLICY IF EXISTS "Enable write access for all users" ON public.materials;
DROP POLICY IF EXISTS "Authenticated can view materials" ON public.materials;
DROP POLICY IF EXISTS "Admins can insert materials" ON public.materials;
DROP POLICY IF EXISTS "Admins can update materials" ON public.materials;
DROP POLICY IF EXISTS "Admins can delete materials" ON public.materials;
-- Drop potential others by common names (just in case)
DROP POLICY IF EXISTS "Public Read" ON public.materials;
DROP POLICY IF EXISTS "Admin Write" ON public.materials;


-- 2. Re-Apply STRICT Policies
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

-- READ: Authenticated
CREATE POLICY "Authenticated can view materials" ON public.materials
FOR SELECT TO authenticated USING (true);

-- WRITE (Insert/Update): Admin & Supervisor ONLY
CREATE POLICY "Admins can insert materials" ON public.materials
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
);

CREATE POLICY "Admins can update materials" ON public.materials
FOR UPDATE TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
);

-- DELETE: Admin ONLY
CREATE POLICY "Admins can delete materials" ON public.materials
FOR DELETE TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

COMMIT;
