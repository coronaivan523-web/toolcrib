-- Fix Foreign Keys to allow PostgREST joins with profiles
-- Requisition Approvals
ALTER TABLE public.requisition_approvals
DROP CONSTRAINT IF EXISTS requisition_approvals_assigned_to_user_id_fkey;

ALTER TABLE public.requisition_approvals
ADD CONSTRAINT requisition_approvals_assigned_to_user_id_fkey
FOREIGN KEY (assigned_to_user_id) REFERENCES public.profiles(id);

-- Also for action_by_user_id
ALTER TABLE public.requisition_approvals
DROP CONSTRAINT IF EXISTS requisition_approvals_action_by_user_id_fkey;

ALTER TABLE public.requisition_approvals
ADD CONSTRAINT requisition_approvals_action_by_user_id_fkey
FOREIGN KEY (action_by_user_id) REFERENCES public.profiles(id);

-- Also for Requisitions created_by (which we just added, likely points to auth.users by default)
ALTER TABLE public.requisitions
DROP CONSTRAINT IF EXISTS requisitions_created_by_fkey;

ALTER TABLE public.requisitions
ADD CONSTRAINT requisitions_created_by_fkey
FOREIGN KEY (created_by) REFERENCES public.profiles(id);
