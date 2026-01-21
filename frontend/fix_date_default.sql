
ALTER TABLE public.cycle_count_sessions ALTER COLUMN planned_date DROP DEFAULT;
ALTER TABLE public.cycle_count_sessions ALTER COLUMN planned_date DROP NOT NULL;
