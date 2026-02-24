-- db/migrations/ledger_v2/008_baseline_rollback.sql
-- Safely removes all baseline entries from the ledger

DO $$ 
DECLARE 
    v_deleted_count INT := 0;
BEGIN
    DELETE FROM public.inventory_ledger_v2 
    WHERE reference_id = 'BASELINE_INIT' 
      AND (metadata->>'baseline')::boolean = true;

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RAISE NOTICE 'Baseline rollback complete. Rows deleted: %', v_deleted_count;
END $$;
