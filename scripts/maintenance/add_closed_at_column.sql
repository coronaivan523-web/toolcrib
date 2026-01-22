/* Add closed_at column to tickets table */

ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

-- Create index for faster queries on closed tickets
CREATE INDEX IF NOT EXISTS idx_tickets_closed_at ON tickets(closed_at);
