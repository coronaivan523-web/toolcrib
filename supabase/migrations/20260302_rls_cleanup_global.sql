-- Supabase Migration: 20260302_rls_cleanup_global.sql
-- Description: HC-3 Phase 3.1 - Global RLS Cleanup (Remove Permissive Policies)

-- Eliminar políticas permisivas detectadas
DROP POLICY IF EXISTS "Enable read access for all users" ON public.locations;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.requisitions;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.cycle_count_lines;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.cycle_count_sessions;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.ticket_items;
DROP POLICY IF EXISTS "Allow all auth" ON public.requisition_approvals;
DROP POLICY IF EXISTS "Allow all auth" ON public.requisition_attachments;
DROP POLICY IF EXISTS "Material events are viewable by everyone" ON public.material_events;
