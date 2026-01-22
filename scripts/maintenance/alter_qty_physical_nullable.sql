-- Migration: Make qty_physical nullable in cycle_count_lines
ALTER TABLE public.cycle_count_lines ALTER COLUMN qty_physical DROP NOT NULL;
