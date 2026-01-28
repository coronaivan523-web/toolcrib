-- Migration: Add PPE Control Columns (Final Step 1)
-- Description: Adds columns for Security Role, Operator ID, and Manual Validity/Renewal Date.

-- 1. Update 'materials' table
-- Add 'is_ppe' flag to identify safety equipment
ALTER TABLE public.materials 
ADD COLUMN IF NOT EXISTS is_ppe boolean DEFAULT false;

-- 2. Update 'tickets' table
-- Add 'operator_name' to identify the recipient (without user account)
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS operator_name text;

-- Add 'is_ppe_ticket' to distinguish this flow
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS is_ppe_ticket boolean DEFAULT false;

-- Add 'renewal_date' so Security can manually set when the PPE expires/can be renewed
-- This replaces the automatic lifespan calculation approach
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS renewal_date date;

-- 3. Notify schema reload
NOTIFY pgrst, 'reload schema';
