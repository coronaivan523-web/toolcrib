-- Enable Realtime Replication for critical tables
-- This is necessary for the Realtime subscription in the frontend to receive updates
-- when users on different devices make changes.

-- Enable for 'tickets' table
ALTER PUBLICATION supabase_realtime ADD TABLE tickets;

-- Enable for 'ticket_items' table (to see stock/status changes)
ALTER PUBLICATION supabase_realtime ADD TABLE ticket_items;

-- Enable for 'materials' table (to see stock updates immediately)
ALTER PUBLICATION supabase_realtime ADD TABLE materials;

-- Enable for 'notifications' table (to see new alerts)
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
