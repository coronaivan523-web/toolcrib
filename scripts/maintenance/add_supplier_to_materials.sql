-- Add supplier column to materials table
-- This will store the supplier name for each material, registered during incoming receipt

ALTER TABLE materials 
ADD COLUMN IF NOT EXISTS supplier VARCHAR(255);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_materials_supplier ON materials(supplier);

COMMENT ON COLUMN materials.supplier IS 'Name of the supplier who provided this material, registered during incoming receipt';
