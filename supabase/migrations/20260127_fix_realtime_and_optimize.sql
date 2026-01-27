-- Enable Realtime for Tickets (Fixing Sync Issue)
alter publication supabase_realtime add table tickets;
alter publication supabase_realtime add table ticket_items;

-- Optimization RPC: Deliver Ticket (Fixing Slowness)
-- Handles the entire delivery logic (status update, stock deduction, movements) in a single DB transaction
create or replace function deliver_ticket(p_ticket_id uuid, p_user_id uuid)
returns json
language plpgsql
security definer
as $$
declare
  v_ticket record;
  v_item record;
  v_qty_requested int;
  v_user_email text;
begin
  -- Get User Email for notes (optional)
  select email into v_user_email from auth.users where id = p_user_id;

  -- 1. Get Ticket
  select * into v_ticket from tickets where id = p_ticket_id;
  if not found then
    raise exception 'Ticket not found';
  end if;

  if v_ticket.status in ('ENTREGADO', 'RECHAZADO', 'CLOSED', 'CANCELLED') then
    raise exception 'Ticket already processed';
  end if;

  -- 2. Update Ticket Status
  update tickets
  set status = 'ENTREGADO',
      assigned_to = p_user_id,
      updated_at = now()
  where id = p_ticket_id;

  -- 3. Process Items
  for v_item in select * from ticket_items where ticket_id = p_ticket_id loop
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
      coalesce(v_ticket.folio::text, p_ticket_id::text), 
      'Ticket Delivery via QuickAction'
    );

  end loop;

  return json_build_object('success', true, 'message', 'Ticket delivered successfully');
exception when others then
  return json_build_object('success', false, 'message', SQLERRM);
end;
$$;
