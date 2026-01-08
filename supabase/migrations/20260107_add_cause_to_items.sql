-- Migration: Add cause column to requisition_items
-- Created: 2026-01-07

ALTER TABLE public.requisition_items ADD COLUMN IF NOT EXISTS cause TEXT;
