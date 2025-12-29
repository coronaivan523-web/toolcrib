-- Remove the CHECK constraint on step_name to allow dynamic approval step names
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'requisition_approvals_step_name_check') THEN 
        ALTER TABLE public.requisition_approvals DROP CONSTRAINT requisition_approvals_step_name_check; 
    END IF; 
END $$;
