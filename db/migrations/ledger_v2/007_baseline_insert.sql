-- db/migrations/ledger_v2/007_baseline_insert.sql
-- Inserts the initial baseline stock from materials into the ledger
-- Safe to re-run (idempotent) based on the unique idempotency_key

DO $$ 
DECLARE 
    v_snapshot_uuid UUID := gen_random_uuid();
    v_inserted_count INT := 0;
BEGIN
    -- 1. Insert Baseline
    -- We use an UPSERT (ON CONFLICT DO NOTHING) to guarantee idempotency.
    -- The idempotency_key is tied to the material_id and a fixed string 'BASELINE_INIT'
    -- ensuring this can only ever run successfully once per material.
    
    INSERT INTO public.inventory_ledger_v2 (
        material_id, 
        movement_type, 
        quantity, 
        reference_type, 
        reference_id, 
        idempotency_key, 
        created_by, 
        metadata
    )
    SELECT 
        id,
        'IN', -- Initial stock is an inbound movement
        COALESCE(current_stock, 0),
        'MANUAL', -- Since 'BASELINE' is not in the ENUM, we use MANUAL with specific metadata
        'BASELINE_INIT',
        'BASELINE_INIT:' || id::TEXT, -- Unique per material
        NULL, -- System generated
        jsonb_build_object(
            'baseline', true,
            'source', 'materials.current_stock',
            'snapshot_id', v_snapshot_uuid,
            'taken_at', now()
        )
    FROM public.materials
    WHERE current_stock IS NOT NULL AND current_stock != 0
    ON CONFLICT (idempotency_key) DO NOTHING;

    GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
    RAISE NOTICE 'Baseline insertion complete. Rows inserted/affected: %', v_inserted_count;
END $$;
