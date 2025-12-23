-- Create Requisitions Table
CREATE TABLE IF NOT EXISTS public.requisitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folio SERIAL,
    requester_id UUID REFERENCES auth.users(id) NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ORDERED', 'RECEIVED', 'CLOSED', 'CANCELLED')),
    priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
    justification TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);

-- Create Requisition Items Table
CREATE TABLE IF NOT EXISTS public.requisition_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requisition_id UUID REFERENCES public.requisitions(id) ON DELETE CASCADE,
    material_id BIGINT REFERENCES public.materials(id),
    quantity_requested INTEGER NOT NULL,
    quantity_approved INTEGER,
    unit TEXT,
    notes TEXT
);

-- Create Requisition Approvals (Audit Trail) Table
CREATE TABLE IF NOT EXISTS public.requisition_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requisition_id UUID REFERENCES public.requisitions(id) ON DELETE CASCADE,
    approver_id UUID REFERENCES auth.users(id),
    role_at_time TEXT,
    action TEXT NOT NULL CHECK (action IN ('REVIEWED', 'APPROVED', 'REJECTED', 'ORDERED', 'RECEIVED')),
    comments TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisition_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisition_approvals ENABLE ROW LEVEL SECURITY;

-- Simple Policies (adjust as per specific role needs later, for now permissive for auth users to ease dev)
CREATE POLICY "Allow read for authenticated" ON public.requisitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert for authenticated" ON public.requisitions FOR INSERT TO authenticated WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Allow update for authenticated" ON public.requisitions FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow read for authenticated" ON public.requisition_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON public.requisition_items FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow read for authenticated" ON public.requisition_approvals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON public.requisition_approvals FOR ALL TO authenticated USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_requisitions_requester ON public.requisitions(requester_id);
CREATE INDEX IF NOT EXISTS idx_requisitions_status ON public.requisitions(status);
