-- db/migrations/ledger_v2/003_create_rpc_process_ledger_movement.sql
-- Centralized atomic RPC for ledger insertion with negative stock constraint

CREATE OR REPLACE FUNCTION public.process_ledger_movement(p_payload JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_material_id BIGINT;
    v_qty INTEGER;
    v_idempotency_key VARCHAR;
    v_derived_stock INTEGER;
BEGIN
    -- Extract mandatory keys
    v_material_id := (p_payload->>'material_id')::BIGINT;
    v_qty := (p_payload->>'quantity')::INTEGER;
    v_idempotency_key := p_payload->>'idempotency_key';

    -- 1. Idempotency Check (Graceful exit if already processed)
    IF EXISTS (SELECT 1 FROM public.inventory_ledger_v2 WHERE idempotency_key = v_idempotency_key) THEN
        RETURN; -- Silently return OK
    END IF;

    -- 2. Concurrency Lock on Material row (Guarantees isolation)
    PERFORM 1 FROM public.materials WHERE id = v_material_id FOR UPDATE;

    -- 3. Insert into Ledger
    INSERT INTO public.inventory_ledger_v2 (
        material_id, movement_type, quantity, reference_type, reference_id, idempotency_key, created_by, metadata
    ) VALUES (
        v_material_id,
        p_payload->>'movement_type',
        v_qty,
        p_payload->>'reference_type',
        p_payload->>'reference_id',
        v_idempotency_key,
        (p_payload->>'created_by')::UUID,
        COALESCE(p_payload->'metadata', '{}'::JSONB)
    );

    -- 4. Validate Derived Stock (No Negatives Allowed)
    -- Skip validation if running in shadow mode (baseline not established yet)
    IF COALESCE(p_payload->'metadata'->>'shadow_mode', 'false') != 'true' THEN
        SELECT current_stock INTO v_derived_stock 
        FROM public.vw_material_stock 
        WHERE material_id = v_material_id;

        IF COALESCE(v_derived_stock, 0) < 0 THEN
            RAISE EXCEPTION 'Insufficient stock. Transaction would result in negative inventory.';
        END IF;
    END IF;

END;
$$;
