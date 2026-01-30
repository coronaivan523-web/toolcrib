-- BLOCK 4: KARDEX HARDENING & CLEANUP
BEGIN;

-- -------------------------------------------------------
-- 1. Hardening 'inventory_movements' (KARDEX)
-- GOAL: Immutable History (Insert Only, No Delete/Update)
-- -------------------------------------------------------
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- Drop old policies if any
DROP POLICY IF EXISTS "Enable read access for all users" ON public.inventory_movements;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.inventory_movements;
DROP POLICY IF EXISTS "Admins can update movements" ON public.inventory_movements; -- Ensure no update policy remains

-- Policy: READ (Visible to authenticated users, or restrict to Admin/related users?
-- Keeping it visible to auth users for now allows checking history, 
-- but we could restrict it. Prompt didn't specify READ restriction, so we stick to AUTH READ)
CREATE POLICY "Authenticated can view movements" ON public.inventory_movements
FOR SELECT TO authenticated USING (true);

-- Policy: INSERT (Authenticated users can trigger movements via API)
-- The API uses the user's token.
CREATE POLICY "Authenticated can create movements" ON public.inventory_movements
FOR INSERT TO authenticated WITH CHECK (true);

-- NO POLICY FOR UPDATE or DELETE = DENY ALL (Immutable)


-- -------------------------------------------------------
-- 2. Hardening 'materials'
-- GOAL: Public Read, Admin/Supervisor Write
-- -------------------------------------------------------
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

-- Drop old permissive policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.materials;
DROP POLICY IF EXISTS "Enable write access for all users" ON public.materials;

-- Policy: READ (All authenticated users need to see materials to pick them)
CREATE POLICY "Authenticated can view materials" ON public.materials
FOR SELECT TO authenticated USING (true);

-- Policy: INSERT (Admin/Supervisor Only)
CREATE POLICY "Admins can insert materials" ON public.materials
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
);

-- Policy: UPDATE (Admin/Supervisor Only)
-- Note: 'current_stock' updates usually happen via Trigger or specific flows.
-- If the API updates stock directly, the user needs permission.
-- If we want strict control, usually only specific functions update stock. 
-- But typically Admin CRUD on materials requires this.
CREATE POLICY "Admins can update materials" ON public.materials
FOR UPDATE TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
);

-- Policy: DELETE (Admin Only?)
CREATE POLICY "Admins can delete materials" ON public.materials
FOR DELETE TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);


-- -------------------------------------------------------
-- 3. RPC: confirm_initial_inventory
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.confirm_initial_inventory(
    p_material_id BIGINT, 
    p_quantity INTEGER, 
    p_notes TEXT DEFAULT 'Initial Inventory Setup'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Bypasses RLS to write to materials/movements even if logic changes
SET search_path = public
AS $$
DECLARE
    v_role text;
    v_old_stock integer;
    v_new_movement_id bigint;
BEGIN
    -- A. Validate Role
    SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
    
    IF v_role NOT IN ('admin') THEN -- Only Admin typically sets initial inventory
        RAISE EXCEPTION 'Access Denied: Only Admins can confirm initial inventory.';
    END IF;

    -- B. Get current info
    SELECT current_stock INTO v_old_stock FROM public.materials WHERE id = p_material_id;
    
    IF v_old_stock IS NULL THEN
        RAISE EXCEPTION 'Material not found.';
    END IF;

    -- C. Update Material
    UPDATE public.materials
    SET current_stock = p_quantity,
        updated_at = now()
    WHERE id = p_material_id;

    -- D. Log Movement (Kardex)
    -- Using a distinct movement type 'INITIAL_COUNT' or 'AUDIT'
    INSERT INTO public.inventory_movements (
        material_id, 
        quantity_change, 
        movement_type, 
        notes, 
        created_by
    )
    VALUES (
        p_material_id,
        (p_quantity - v_old_stock), -- Change delta. If old=0, new=10, change=10.
        'AUDIT', -- Standard type for manual adjustments, or 'INITIAL_COUNT' if enum allows
        p_notes,
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

COMMIT;
