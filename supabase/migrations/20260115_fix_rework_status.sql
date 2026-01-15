
-- Migration: Fix Rework Status
-- Date: 2026-01-15
-- Description: Updates the requisitions_status_check constraint to include 'REWORK_REQUIRED'.

DO $$
BEGIN
    -- Drop the existing constraint if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'requisitions_status_check' 
        AND table_name = 'requisitions'
    ) THEN
        ALTER TABLE public.requisitions DROP CONSTRAINT requisitions_status_check;
    END IF;

    -- Add the updated constraint
    ALTER TABLE public.requisitions ADD CONSTRAINT requisitions_status_check CHECK (status IN (
        'DRAFT', 
        'PENDING_APPROVAL', 
        'UNDER_APPROVAL', 
        'REWORK_REQUIRED', -- Added this
        'APPROVED_PRE_PURCHASE', 
        'APPROVED', 
        'ORDERED', 
        'RECEIVED',
        'PARTIALLY_RECEIVED',
        'CANCELLED', 
        'CANCELED', -- Legacy support just in case
        'REJECTED',
        'REJECTED_FINAL',
        'CLOSED'
    ));
END $$;
