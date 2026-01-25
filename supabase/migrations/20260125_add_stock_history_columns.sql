
-- Migration: Add detailed stock tracking columns to inventory_movements
-- Date: 2026-01-25

DO $$
BEGIN
    -- 1. previous_stock_level
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_movements' AND column_name = 'previous_stock_level') THEN
        ALTER TABLE public.inventory_movements ADD COLUMN previous_stock_level numeric;
    END IF;

    -- 2. new_stock_level
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_movements' AND column_name = 'new_stock_level') THEN
        ALTER TABLE public.inventory_movements ADD COLUMN new_stock_level numeric;
    END IF;

    -- 3. quantity_change
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_movements' AND column_name = 'quantity_change') THEN
        ALTER TABLE public.inventory_movements ADD COLUMN quantity_change numeric;
    END IF;

END $$;
