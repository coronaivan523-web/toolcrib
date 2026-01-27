
import os
import sys
import psycopg2

# Connection string
DB_URL = "postgresql://postgres.bykumuizmxsclsazeych:Changos3.3@aws-1-us-east-1.pooler.supabase.com:5432/postgres"

# SQL to fix the function
SQL_fix = """
-- First, drop the old function because changing argument types requires it
DROP FUNCTION IF EXISTS deliver_ticket(uuid, uuid);

-- Recreate with BIGINT for ticket_id
create or replace function deliver_ticket(p_ticket_id bigint, p_user_id uuid)
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
    -- reference_id is INTEGER, so we cast p_ticket_id (bigint) to text if needed or just use it if implicit cast works.
    -- Wait, reference_id is INTEGER. p_ticket_id is BIGINT. Should be fine, assuming IDs fit in INTEGER.
    -- If IDs are very large, reference_id should be BIGINT. check_tickets_schema said id is 'int8' (BIGINT).
    -- check_reference_id_type.py said reference_id is 'integer' (INT4).
    -- This might be a risk if IDs exceed 2 billion. But for now, let's cast p_ticket_id::integer.
    
    insert into inventory_movements (material_id, movement_type, quantity, user_id, reference_type, reference_id, notes)
    values (
      v_item.material_id, 
      'OUT', 
      v_qty_requested, 
      p_user_id, 
      'TICKET', 
      p_ticket_id::integer, -- Cast BIGINT to INTEGER for reference_id
      'Ticket Delivery via QuickAction'
    );

  end loop;

  return json_build_object('success', true, 'message', 'Ticket delivered successfully');
exception when others then
  return json_build_object('success', false, 'message', SQLERRM);
end;
$$;
"""

def apply_fix():
    print(f"--- Fixing deliver_ticket Function ---")
    
    try:
        # Connect
        print(f"Connecting to {DB_URL.split('@')[1]}...")
        conn = psycopg2.connect(DB_URL)
        conn.autocommit = True
        
        with conn.cursor() as cur:
            print("Executing SQL...")
            cur.execute(SQL_fix)
            print("Function updated successfully.")
            
            # Notify PostgREST to reload schema
            print("Reloading PostgREST schema cache...")
            cur.execute("NOTIFY pgrst, 'reload schema'")
            print("Reload signal sent.")
            
        conn.close()
        
    except Exception as e:
        print(f"Migration Failed: {e}")

if __name__ == "__main__":
    apply_fix()
