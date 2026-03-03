-- Supabase Migration: 20260302_stock_non_negative_constraint.sql
-- Description: HC-2.1 Motor Level Protection against negative stock

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_schema = 'public'
          AND table_name = 'materials'
          AND constraint_name = 'materials_current_stock_non_negative'
    ) THEN
        ALTER TABLE materials
        ADD CONSTRAINT materials_current_stock_non_negative
        CHECK (current_stock >= 0);
    END IF;
END $$;
