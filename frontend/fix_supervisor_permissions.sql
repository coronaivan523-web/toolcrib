/* Fix Supervisor Permissions */
/* Run this script in the Supabase SQL Editor to enable Supervisor actions */

/* 1. Allow Supervisors to Update Materials (Deduct Stock) */
CREATE POLICY "Supervisors can update materials"
ON public.materials
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'supervisor'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'supervisor'
  )
);

/* 2. Allow Supervisors to Update Tickets (Change Status) */
CREATE POLICY "Supervisors can update tickets"
ON public.tickets
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'supervisor'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'supervisor'
  )
);

/* 3. Allow Supervisors to Update Ticket Items (Mark Fulfilled/Cancelled) */
CREATE POLICY "Supervisors can update ticket items"
ON public.ticket_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'supervisor'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'supervisor'
  )
);
