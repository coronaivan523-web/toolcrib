-- Add RECEIVED and PARTIALLY_RECEIVED to status check
ALTER TABLE public.requisitions DROP CONSTRAINT IF EXISTS requisitions_status_check;

ALTER TABLE public.requisitions ADD CONSTRAINT requisitions_status_check CHECK (status IN (
    'DRAFT', 
    'PENDING_APPROVAL', 
    'UNDER_APPROVAL', 
    'APPROVED_PRE_PURCHASE', 
    'APPROVED', 
    'ORDERED', 
    'RECEIVED',
    'PARTIALLY_RECEIVED',
    'CANCELLED', 
    'REJECTED',
    'CLOSED'
));
