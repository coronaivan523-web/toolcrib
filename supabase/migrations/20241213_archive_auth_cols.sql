-- Migration: Multi-Signature Auth Columns
-- 1. Add columns to archived_materials
ALTER TABLE public.archived_materials ADD COLUMN IF NOT EXISTS auth_chinese_name text;
ALTER TABLE public.archived_materials ADD COLUMN IF NOT EXISTS auth_mexican_name text;
ALTER TABLE public.archived_materials ADD COLUMN IF NOT EXISTS auth_technical_name text;

-- 2. Update RPC Function to accept new params
CREATE OR REPLACE FUNCTION archive_material_transaction(
    p_material_id bigint,
    p_reason text,
    p_user_id uuid,
    p_auth_chinese text DEFAULT NULL,
    p_auth_mexican text DEFAULT NULL,
    p_auth_technical text DEFAULT NULL
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
        archived_at, archived_by, archive_reason,
        auth_chinese_name, auth_mexican_name, auth_technical_name
    ) VALUES (
        v_material_record.id,
        v_material_record.part_number, v_material_record.name, v_material_record.description, v_material_record.category, v_material_record.material_type,
        v_material_record.abc_class, v_material_record.origin_country, v_material_record.unit_of_measure,
        v_material_record.min_stock, v_material_record.max_stock, v_material_record.current_stock,
        v_material_record.location, v_material_record.process, v_material_record."Area",
        v_material_record.requested_by, v_material_record.requested_by_position, v_material_record.machine_asset,
        v_material_record.created_at, v_material_record.created_by, v_material_record.action_type, v_material_record.image_url,
        now(), p_user_id, p_reason,
        p_auth_chinese, p_auth_mexican, p_auth_technical
    );

    -- Delete from Materials
    DELETE FROM public.materials WHERE id = p_material_id;

END;
$$;
