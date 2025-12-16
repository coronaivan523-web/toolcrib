-- Add Plant column to tickets table
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS plant text;
