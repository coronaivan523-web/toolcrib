-- Cycle Count Sessions
CREATE TABLE IF NOT EXISTS public.cycle_count_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id),
    status TEXT NOT NULL DEFAULT 'DRAFT', -- DRAFT, SUBMITTED, APPROVED, REJECTED, CANCELLED
    count_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    location_scope TEXT,
    approved_by UUID REFERENCES public.profiles(id),
    approved_at TIMESTAMP WITH TIME ZONE
);

-- Cycle Count Lines
CREATE TABLE IF NOT EXISTS public.cycle_count_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.cycle_count_sessions(id) ON DELETE CASCADE,
    material_id BIGINT REFERENCES public.materials(id),
    location_id BIGINT REFERENCES public.locations(id),
    qty_system NUMERIC NOT NULL DEFAULT 0,
    qty_physical NUMERIC NOT NULL DEFAULT 0,
    variance NUMERIC GENERATED ALWAYS AS (qty_physical - qty_system) STORED,
    reason_code TEXT,
    evidence_urls JSONB,
    counted_by UUID REFERENCES public.profiles(id),
    counted_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Inventory Adjustments
CREATE TABLE IF NOT EXISTS public.inventory_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    approved_by UUID REFERENCES public.profiles(id),
    session_id UUID REFERENCES public.cycle_count_sessions(id),
    material_id BIGINT REFERENCES public.materials(id),
    location_id BIGINT REFERENCES public.locations(id),
    qty_before NUMERIC NOT NULL,
    qty_after NUMERIC NOT NULL,
    delta NUMERIC NOT NULL,
    reason_code TEXT
);

-- Enable RLS
ALTER TABLE public.cycle_count_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycle_count_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_adjustments ENABLE ROW LEVEL SECURITY;

-- Policies (Allow all authenticated users for now, permissions handled by app logic)
-- Drop existing policies if re-running to avoid errors
DROP POLICY IF EXISTS "Cycle Sessions Access" ON public.cycle_count_sessions;
CREATE POLICY "Cycle Sessions Access" ON public.cycle_count_sessions FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Cycle Lines Access" ON public.cycle_count_lines;
CREATE POLICY "Cycle Lines Access" ON public.cycle_count_lines FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Adjustments Access" ON public.inventory_adjustments;
CREATE POLICY "Adjustments Access" ON public.inventory_adjustments FOR ALL USING (auth.role() = 'authenticated');
