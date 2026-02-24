-- db/migrations/ledger_v2/009_baseline_validation_queries.sql
-- Run these queries after 007_baseline_insert.sql to determine Go/No-Go.

-- Q1: Verify absolute consistency (Delta should be 0 or very close if there was activity during snapshot)
SELECT 
    m.id AS material_id, 
    m.current_stock AS legacy_stock, 
    COALESCE(v.current_stock, 0) AS derived_stock,
    (m.current_stock - COALESCE(v.current_stock, 0)) as discrepancy_delta
FROM public.materials m
LEFT JOIN public.vw_material_stock v ON m.id = v.material_id
WHERE m.current_stock != COALESCE(v.current_stock, 0);
-- GOAL: 0 rows returned (or very few if a movement happened perfectly during baseline execution).

-- Q2: Detect duplications by Idempotency Key
SELECT idempotency_key, COUNT(*) as ocurrencias
FROM public.inventory_ledger_v2
GROUP BY idempotency_key
HAVING COUNT(*) > 1;
-- GOAL: 0 rows returned.

-- Q3: Detect double execution by reference
SELECT reference_type, reference_id, material_id, quantity, COUNT(*) as ocurrencias
FROM public.inventory_ledger_v2
WHERE reference_type != 'MANUAL'
GROUP BY reference_type, reference_id, material_id, quantity
HAVING COUNT(*) > 1;
-- GOAL: 0 rows returned.

-- Q4: Sample Latest Transactions across Domains
SELECT 
    reference_type, 
    movement_type, 
    quantity, 
    created_at, 
    metadata->>'shadow_mode' as is_shadow
FROM public.inventory_ledger_v2
ORDER BY created_at DESC 
LIMIT 20;
-- GOAL: Visual inspection of recent activity.
