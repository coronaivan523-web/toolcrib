-- Transactional Migration for Requisitions V2
BEGIN;

-- 1. Drop existing tables if they exist (Clean Wipe)
DROP TABLE IF EXISTS public.requisition_attachments CASCADE;
DROP TABLE IF EXISTS public.requisition_approvals CASCADE;
DROP TABLE IF EXISTS public.requisition_items CASCADE;
DROP TABLE IF EXISTS public.requisitions CASCADE;

-- 2. Sequence removed (Using Folio strategy)

-- 3. Create Requisitions Table
CREATE TABLE public.requisitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folio SERIAL, -- Internal usage
    req_number TEXT UNIQUE, -- Format: REQ-YYYY-####
    requester_id UUID REFERENCES auth.users(id) NOT NULL,
    
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
        'DRAFT', 
        'UNDER_APPROVAL', 
        'REWORK_REQUIRED', 
        'APPROVED_PRE_PURCHASE', 
        'CANCELED', 
        'REJECTED_FINAL'
    )),
    
    priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
    justification TEXT,
    
    -- Approvers snapshot (assignments)
    gerente_mx_id UUID REFERENCES auth.users(id),
    gerente_ch_id UUID REFERENCES auth.users(id),
    gerente_gral_id UUID REFERENCES auth.users(id),
    
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);

-- 4. Create Requisition Items Table
CREATE TABLE public.requisition_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requisition_id UUID REFERENCES public.requisitions(id) ON DELETE CASCADE,
    material_id BIGINT REFERENCES public.materials(id),
    quantity_requested INTEGER NOT NULL,
    quantity_approved INTEGER, -- Can be adjusted during approval
    unit TEXT,
    notes TEXT
);

-- 5. Create Requisition Approvals (Workflow) Table
CREATE TABLE public.requisition_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requisition_id UUID REFERENCES public.requisitions(id) ON DELETE CASCADE,
    
    step_order INTEGER NOT NULL, -- 1, 2, 3, 4
    step_name TEXT NOT NULL CHECK (step_name IN ('SOLICITANTE', 'GERENTE_MX', 'GERENTE_CH', 'GERENTE_GENERAL')),
    
    assigned_to_user_id UUID REFERENCES auth.users(id), -- Who must approve
    
    step_status TEXT NOT NULL DEFAULT 'WAITING' CHECK (step_status IN ('WAITING', 'PENDING', 'APPROVED', 'REJECTED', 'SKIPPED')),
    
    assigned_at TIMESTAMPTZ, -- When it became PENDING
    action_at TIMESTAMPTZ, -- When it was APPROVED/REJECTED
    action_by_user_id UUID REFERENCES auth.users(id), -- Logic might allow delegated approval later?
    
    comment TEXT, -- Mandatory on REJECT
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create Requisition Attachments Table
CREATE TABLE public.requisition_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requisition_id UUID REFERENCES public.requisitions(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    url TEXT NOT NULL,
    uploaded_by UUID REFERENCES auth.users(id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Enable RLS
ALTER TABLE public.requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisition_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisition_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisition_attachments ENABLE ROW LEVEL SECURITY;

-- 8. Policies (Simple permissive for authenticated dev)
CREATE POLICY "Allow all auth" ON public.requisitions FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all auth" ON public.requisition_items FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all auth" ON public.requisition_approvals FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all auth" ON public.requisition_attachments FOR ALL TO authenticated USING (true);

-- 9. Function for Atomic Req Number (Optional helper, but usually handled in App logic transactionally. DB sequence is created above)
-- We will use `nextval('public.requisition_number_seq')` in Python to format the string safely.

COMMIT;
