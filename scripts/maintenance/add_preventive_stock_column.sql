-- Add pending_stock column if it doesn't exist
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS pending_stock integer DEFAULT 0;

-- Function to calculate and update pending stock for a specific material
CREATE OR REPLACE FUNCTION public.update_material_pending_stock(target_material_id bigint)
RETURNS void AS $$
BEGIN
    UPDATE public.materials
    SET pending_stock = (
        SELECT COALESCE(SUM(ti.quantity_requested), 0)
        FROM public.ticket_items ti
        JOIN public.tickets t ON ti.ticket_id = t.id
        WHERE ti.material_id = target_material_id
        -- statuses that hold stock but haven't consumed it yet
        AND t.status IN ('PENDIENTE', 'IN_PROCESS', 'READY', 'pending') 
        -- Exclude items that are already practically processed/cancelled specifically if tracking that granularity, 
        -- but usually ticket status governs.
        -- We also check item_status if relevant, but ticket status is the main gate.
    )
    WHERE id = target_material_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger Function for Ticket Items (Insert/Update/Delete)
CREATE OR REPLACE FUNCTION public.trigger_update_pending_stock_items()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        PERFORM public.update_material_pending_stock(OLD.material_id);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        PERFORM public.update_material_pending_stock(NEW.material_id);
        IF (OLD.material_id <> NEW.material_id) THEN
            PERFORM public.update_material_pending_stock(OLD.material_id);
        END IF;
        RETURN NEW;
    ELSE -- INSERT
        PERFORM public.update_material_pending_stock(NEW.material_id);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger Function for Tickets (Status Change)
CREATE OR REPLACE FUNCTION public.trigger_update_pending_stock_tickets()
RETURNS TRIGGER AS $$
DECLARE
    rec RECORD;
BEGIN
    -- If status changed, we need to convert relevant materials
    IF (OLD.status <> NEW.status) THEN
        FOR rec IN SELECT material_id FROM public.ticket_items WHERE ticket_id = NEW.id LOOP
            PERFORM public.update_material_pending_stock(rec.material_id);
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply Triggers
DROP TRIGGER IF EXISTS trg_update_pending_items ON public.ticket_items;
CREATE TRIGGER trg_update_pending_items
AFTER INSERT OR UPDATE OR DELETE ON public.ticket_items
FOR EACH ROW EXECUTE FUNCTION public.trigger_update_pending_stock_items();

DROP TRIGGER IF EXISTS trg_update_pending_tickets ON public.tickets;
CREATE TRIGGER trg_update_pending_tickets
AFTER UPDATE OF status ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.trigger_update_pending_stock_tickets();

-- Initial Calculation for existing data
DO $$
DECLARE
    m RECORD;
BEGIN
    FOR m IN SELECT id FROM public.materials LOOP
        PERFORM public.update_material_pending_stock(m.id);
    END LOOP;
END;
$$;
