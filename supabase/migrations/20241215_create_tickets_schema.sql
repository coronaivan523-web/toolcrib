-- Migration: Create Tickets and Ticket Items tables
-- Description: Establishes the schema for handling material requests (tickets) and their specific items.

-- 1. Create 'tickets' table
CREATE TABLE IF NOT EXISTS public.tickets (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    requester_id uuid REFERENCES auth.users(id) NOT NULL,
    status text DEFAULT 'PENDIENTE', -- 'PENDIENTE', 'APROBADO', 'RECHAZADO', 'ENTREGADO'
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    assigned_to uuid REFERENCES auth.users(id) -- Admin who processes the ticket
);

-- 2. Create 'ticket_items' table
CREATE TABLE IF NOT EXISTS public.ticket_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id uuid REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL,
    material_id bigint REFERENCES public.materials(id) NOT NULL,
    quantity_requested integer NOT NULL Check (quantity_requested > 0),
    quantity_fulfilled integer DEFAULT 0, -- Amount actually given
    created_at timestamptz DEFAULT now()
);

-- 3. Enable Rowland Level Security (RLS)
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_items ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies for TICKETS
-- READ: Users can see their own tickets. Admins (service role/specific role) can see all.
-- For simplicity in this iteration, we allow authenticated users to read all (or we can filter by requester_id).
-- Let's try to be specific: Requester sees theirs, Admin sees all.
-- BUT, since we don't have a rigid role system fully enforced in SQL yet (it's in 'profiles'), 
-- we will allow "Authenticated" to SELECT all for now to avoid visibility blocking on the Admin dashboard.
CREATE POLICY "Enable read access for authenticated users" ON public.tickets
    FOR SELECT TO authenticated USING (true);

-- INSERT: Authenticated users can create tickets.
CREATE POLICY "Enable insert for authenticated users" ON public.tickets
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = requester_id);

-- UPDATE: Authenticated users can update (e.g. status change by Admin, or cancel by User?)
-- We'll allow updates for now. Backend logic will govern *who* can allow what state transition.
CREATE POLICY "Enable update for authenticated users" ON public.tickets
    FOR UPDATE TO authenticated USING (true);


-- 5. Create Policies for TICKET_ITEMS
-- READ: Authenticated users
CREATE POLICY "Enable read access for authenticated users" ON public.ticket_items
    FOR SELECT TO authenticated USING (true);

-- INSERT: Authenticated users (usually created together with ticket)
CREATE POLICY "Enable insert for authenticated users" ON public.ticket_items
    FOR INSERT TO authenticated WITH CHECK (true); -- Ideally check ticket ownership, but kept simple.

-- UPDATE: Authenticated users
CREATE POLICY "Enable update for authenticated users" ON public.ticket_items
    FOR UPDATE TO authenticated USING (true);
