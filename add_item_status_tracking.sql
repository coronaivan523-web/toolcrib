/* Migration: Add item-level status tracking to ticket_items */
/* This allows toolroom staff to fulfill or cancel individual items in a ticket */

-- Add new columns to ticket_items table for item-level tracking
ALTER TABLE ticket_items 
ADD COLUMN IF NOT EXISTS item_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS fulfilled_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS fulfilled_at TIMESTAMPTZ;

-- Drop existing constraint if it exists, then add it
ALTER TABLE ticket_items DROP CONSTRAINT IF EXISTS valid_item_status;
ALTER TABLE ticket_items 
ADD CONSTRAINT valid_item_status 
CHECK (item_status IN ('pending', 'fulfilled', 'cancelled'));

-- Create index for faster queries on item_status
CREATE INDEX IF NOT EXISTS idx_ticket_items_status ON ticket_items(item_status);

-- Update existing records to have 'pending' status if NULL
UPDATE ticket_items 
SET item_status = 'pending' 
WHERE item_status IS NULL;

-- Add concurrency control columns to tickets table
-- This prevents multiple toolroom staff from processing the same ticket simultaneously
ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS processing_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ;

-- Create index for faster queries on processing_by
CREATE INDEX IF NOT EXISTS idx_tickets_processing_by ON tickets(processing_by);

-- Verify the ticket_items changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'ticket_items' 
  AND column_name IN ('item_status', 'cancellation_reason', 'fulfilled_by', 'fulfilled_at')
ORDER BY ordinal_position;

-- Verify the tickets changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'tickets' 
  AND column_name IN ('processing_by', 'processing_started_at')
ORDER BY ordinal_position;
