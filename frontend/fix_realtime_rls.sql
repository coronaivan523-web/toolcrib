-- Check and Fix RLS Policies for Realtime Access

-- 1. Check existing policies (for debugging, but we'll apply fixes blindly to be safe)
-- If toolroom_staff does not have a policy to SELECT *all* tickets, they won't get INSERT events for other users' tickets.

-- Policy: Allow toolroom staff and supervisors to view ALL tickets
DROP POLICY IF EXISTS "Toolroom staff and supervisors can view all tickets" ON tickets;
CREATE POLICY "Toolroom staff and supervisors can view all tickets"
ON tickets
FOR SELECT
TO authenticated
USING (
  (auth.jwt() ->> 'role' = 'toolroom_staff') OR 
  (auth.jwt() ->> 'role' = 'supervisor') OR
  (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'toolroom_staff' OR profiles.role = 'supervisor')
  ))
);

-- Policy: Allow toolroom staff and supervisors to view ALL ticket items
DROP POLICY IF EXISTS "Toolroom staff and supervisors can view all ticket items" ON ticket_items;
CREATE POLICY "Toolroom staff and supervisors can view all ticket items"
ON ticket_items
FOR SELECT
TO authenticated
USING (
  (auth.jwt() ->> 'role' = 'toolroom_staff') OR 
  (auth.jwt() ->> 'role' = 'supervisor') OR
  (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'toolroom_staff' OR profiles.role = 'supervisor')
  ))
);

-- Policy: Allow toolroom staff to view ALL notifications
DROP POLICY IF EXISTS "Toolroom staff can view all notifications" ON notifications;
CREATE POLICY "Toolroom staff can view all notifications"
ON notifications
FOR SELECT
TO authenticated
USING (
  (auth.jwt() ->> 'role' = 'toolroom_staff') OR 
  (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'toolroom_staff'
  ))
);
