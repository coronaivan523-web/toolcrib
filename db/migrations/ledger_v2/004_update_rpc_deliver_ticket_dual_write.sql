-- db/migrations/ledger_v2/004_update_rpc_deliver_ticket_dual_write.sql
-- Injects dual-write (Shadow Mode) into the existing deliver_ticket RPC

CREATE OR REPLACE FUNCTION public.deliver_ticket(p_ticket_id bigint, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ticket record;
  v_item record;
  v_qty_requested int;
  v_user_email text;
  v_real_ticket_id bigint;
  v_idempotency_key text;
BEGIN
  -- Get User Email for notes (optional)
  SELECT email INTO v_user_email FROM auth.users WHERE id = p_user_id;

  -- 1. Get Ticket (Try Folio first, then ID)
  SELECT * INTO v_ticket FROM public.tickets WHERE folio = p_ticket_id;
  
  IF NOT FOUND THEN
      -- Fallback to ID
      SELECT * INTO v_ticket FROM public.tickets WHERE id = p_ticket_id;
  END IF;

  IF NOT FOUND OR v_ticket IS NULL THEN
    RAISE EXCEPTION 'Ticket not found';
  END IF;
  
  v_real_ticket_id := v_ticket.id;

  IF v_ticket.status IN ('ENTREGADO', 'RECHAZADO', 'CLOSED', 'CANCELLED') THEN
    RETURN;
  END IF;

  -- 2. Update Ticket Status
  UPDATE public.tickets
  SET status = 'ENTREGADO',
      assigned_to = p_user_id,
      updated_at = now()
  WHERE id = v_real_ticket_id;

  -- 3. Process Items
  FOR v_item IN SELECT * FROM public.ticket_items WHERE ticket_id = v_real_ticket_id LOOP
    v_qty_requested := v_item.quantity_requested;

    -- Update Item
    UPDATE public.ticket_items
    SET quantity_fulfilled = v_qty_requested
    WHERE id = v_item.id;

    -- [LEGACY WRITE] Deduct Material Stock
    UPDATE public.materials
    SET current_stock = current_stock - v_qty_requested
    WHERE id = v_item.material_id;

    -- [LEGACY WRITE] Record Movement (History)
    INSERT INTO public.inventory_movements (material_id, movement_type, quantity, user_id, reference_type, reference_id, notes)
    VALUES (
      v_item.material_id, 'OUT', v_qty_requested, p_user_id, 'TICKET', v_ticket.folio::integer, 'Ticket Delivery via QuickAction'
    );

    -- [DUAL-WRITE INJECTION - SHADOW MODE]
    v_idempotency_key := 'TICKET:' || v_ticket.folio::text || ':' || v_item.material_id::text || ':' || v_qty_requested::text || ':DELIVERY';
    
    PERFORM public.process_ledger_movement(
        jsonb_build_object(
            'material_id', v_item.material_id,
            'movement_type', 'OUT',
            'quantity', -v_qty_requested, -- Negative for OUT
            'reference_type', 'TICKET',
            'reference_id', v_ticket.folio::text,
            'idempotency_key', v_idempotency_key,
            'created_by', p_user_id,
            'metadata', '{}'::jsonb
        )
    );

  END LOOP;
END;
$$;
