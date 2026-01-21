
-- Cycle Count Sessions Table
CREATE TABLE IF NOT EXISTS public.cycle_count_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id),
    status TEXT DEFAULT 'DRAFT', -- 'DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
    admin_notes TEXT,
    planned_date DATE DEFAULT CURRENT_DATE,
    count_date DATE DEFAULT CURRENT_DATE, 
    assigned_to UUID REFERENCES public.profiles(id)
);

-- Cycle Count Lines Table
CREATE TABLE IF NOT EXISTS public.cycle_count_lines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES public.cycle_count_sessions(id) ON DELETE CASCADE,
    material_id BIGINT REFERENCES public.materials(id),
    location_id UUID REFERENCES public.locations(id), -- Optional specific location
    qty_system INTEGER DEFAULT 0, -- Snapshot of system stock
    qty_physical INTEGER DEFAULT 0, -- User counted value
    counted_by UUID REFERENCES public.profiles(id),
    counted_at TIMESTAMPTZ DEFAULT now(),
    count_date DATE DEFAULT CURRENT_DATE, 
    planned_date DATE DEFAULT CURRENT_DATE,
    notes TEXT
);

-- RLS Policies (Simplified for V2)
ALTER TABLE cycle_count_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for authenticated users" ON cycle_count_sessions FOR ALL TO authenticated USING (true);

ALTER TABLE cycle_count_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for authenticated users" ON cycle_count_lines FOR ALL TO authenticated USING (true);

NOTIFY pgrst, 'reload config';
