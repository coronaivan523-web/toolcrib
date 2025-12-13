-- Migration: Archive Strategy
-- 1. Create Archive Table
CREATE TABLE IF NOT EXISTS public.archived_materials (
    -- Inherit ID ?? No, keep original ID as reference or new PK?
    -- Let's keep original ID as 'original_id' and correct structure.
    -- Actually, to be simple, let's copy columns.
    archive_id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    original_id bigint, -- The id from materials table
    
    -- Copied fields
    part_number text,
    name text,
    description text,
    category text,
    material_type text,
    abc_class text,
    origin_country text,
    unit_of_measure text,
    min_stock numeric,
    max_stock numeric,
    current_stock numeric,
    location text,
    process text,
    "Area" text,
    requested_by text,
    requested_by_position text,
    machine_asset text,
    created_at timestamptz,
    created_by uuid,
    action_type text,
    image_url text,
    
    -- Archive Info
    archived_at timestamptz DEFAULT now(),
    archived_by uuid, -- The user performing the action
    archive_reason text
);

-- 2. Create RPC Function for Atomicity
CREATE OR REPLACE FUNCTION archive_material_transaction(
    p_material_id bigint,
    p_reason text,
    p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_material_record record;
BEGIN
    -- Get the data
    SELECT * INTO v_material_record FROM public.materials WHERE id = p_material_id;
    
    IF v_material_record IS NULL THEN
        RAISE EXCEPTION 'Material not found';
    END IF;

    -- Insert into Archive
    INSERT INTO public.archived_materials (
        original_id,
        part_number, name, description, category, material_type,
        abc_class, origin_country, unit_of_measure,
        min_stock, max_stock, current_stock,
        location, process, "Area",
        requested_by, requested_by_position, machine_asset,
        created_at, created_by, action_type, image_url,
        archived_at, archived_by, archive_reason
    ) VALUES (
        v_material_record.id,
        v_material_record.part_number, v_material_record.name, v_material_record.description, v_material_record.category, v_material_record.material_type,
        v_material_record.abc_class, v_material_record.origin_country, v_material_record.unit_of_measure,
        v_material_record.min_stock, v_material_record.max_stock, v_material_record.current_stock,
        v_material_record.location, v_material_record.process, v_material_record."Area",
        v_material_record.requested_by, v_material_record.requested_by_position, v_material_record.machine_asset,
        v_material_record.created_at, v_material_record.created_by, v_material_record.action_type, v_material_record.image_url,
        now(), p_user_id, p_reason
    );

    -- Delete from Materials
    DELETE FROM public.materials WHERE id = p_material_id;

END;
$$;
