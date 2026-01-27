
-- Fix deliver_ticket to support searching by Folio OR ID
-- This resolves issues where frontend sends Folio (e.g. 1029) but backend expects PK (e.g. 29)

create or replace function deliver_ticket(p_ticket_id bigint, p_user_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_ticket record;
  v_item record;
  v_qty_requested int;
  v_user_email text;
  v_real_ticket_id bigint;
begin
  -- Get User Email for notes (optional)
  select email into v_user_email from auth.users where id = p_user_id;

  -- 1. Get Ticket (Try Folio first, then ID to support bothFrontend Usage)
  select * into v_ticket from tickets where folio = p_ticket_id;
  
  if not found then
      -- Fallback to ID
      select * into v_ticket from tickets where id = p_ticket_id;
  end if;

  if not found or v_ticket is null then
    raise exception 'Ticket not found';
  end if;
  
  v_real_ticket_id := v_ticket.id;

  if v_ticket.status in ('ENTREGADO', 'RECHAZADO', 'CLOSED', 'CANCELLED') then
    -- Idempotency: If already delivered, just return (or raise notice)
    return;
  end if;

  -- 2. Update Ticket Status (Use REAL ID)
  update tickets
  set status = 'ENTREGADO',
      assigned_to = p_user_id,
      updated_at = now()
  where id = v_real_ticket_id;

  -- 3. Process Items (Use REAL ID to find items)
  for v_item in select * from ticket_items where ticket_id = v_real_ticket_id loop
    v_qty_requested := v_item.quantity_requested;

    -- Update Item
    update ticket_items
    set quantity_fulfilled = v_qty_requested
    where id = v_item.id;

    -- Deduct Material Stock
    update materials
    set current_stock = current_stock - v_qty_requested
    where id = v_item.material_id;

    -- Record Movement (History)
    insert into inventory_movements (material_id, movement_type, quantity, user_id, reference_type, reference_id, notes)
    values (
      v_item.material_id, 
      'OUT', 
      v_qty_requested, 
      p_user_id, 
      'TICKET', 
      v_ticket.folio::integer, -- Record the FOLIO in history for readability
      'Ticket Delivery via QuickAction'
    );

  end loop;

  -- No return needed
end;
$$;
