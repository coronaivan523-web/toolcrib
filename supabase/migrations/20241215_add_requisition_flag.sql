-- Add 'has_requisition' column to materials table
-- This serves to track if a purchase requisition has been made for low stock items.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials' AND column_name = 'has_requisition') THEN
        ALTER TABLE public.materials ADD COLUMN has_requisition boolean DEFAULT false;
    END IF;
END $$;
