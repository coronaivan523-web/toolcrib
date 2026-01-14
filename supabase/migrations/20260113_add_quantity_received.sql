-- Add quantity_received column to requisition_items
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'requisition_items' AND column_name = 'quantity_received') THEN
        ALTER TABLE public.requisition_items ADD COLUMN quantity_received INTEGER DEFAULT 0;
    END IF;
END $$;
