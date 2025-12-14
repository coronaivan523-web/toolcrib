-- Add columns for detailed modifier information
alter table public.material_events 
add column if not exists modifier_name text,
add column if not exists modifier_position text,
add column if not exists modifier_area text;
