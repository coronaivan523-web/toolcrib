-- Add tables to the supabase_realtime publication to enable broadcast of changes
-- This is necessary for the auto-update feature to work on the frontend

alter publication supabase_realtime add table requisitions;
alter publication supabase_realtime add table requisition_approvals;
