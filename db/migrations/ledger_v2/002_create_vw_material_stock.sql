-- db/migrations/ledger_v2/002_create_vw_material_stock.sql
-- Stock View derived from Ledger

CREATE OR REPLACE VIEW public.vw_material_stock AS
SELECT 
    material_id, 
    COALESCE(SUM(quantity), 0) as current_stock
FROM public.inventory_ledger_v2
GROUP BY material_id;
