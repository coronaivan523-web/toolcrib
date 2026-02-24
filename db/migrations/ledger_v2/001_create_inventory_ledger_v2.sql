-- db/migrations/ledger_v2/001_create_inventory_ledger_v2.sql
-- Shadow Mode Table (Append-Only)

CREATE TABLE IF NOT EXISTS public.inventory_ledger_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id BIGINT NOT NULL REFERENCES public.materials(id) ON DELETE RESTRICT,
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('IN', 'OUT', 'ADJUSTMENT', 'RESERVE', 'RELEASE')),
    quantity INTEGER NOT NULL,
    reference_type VARCHAR(50) NOT NULL CHECK (reference_type IN ('TICKET', 'REQUISITION', 'CYCLE_COUNT', 'MANUAL')),
    reference_id VARCHAR(100),
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_ledger_v2_material ON public.inventory_ledger_v2(material_id);
CREATE INDEX IF NOT EXISTS idx_ledger_v2_movement ON public.inventory_ledger_v2(movement_type);
