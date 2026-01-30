
import os
import sys
import psycopg2

# Connection string
DB_URL = "postgresql://postgres.bykumuizmxsclsazeych:Changos3.3@aws-1-us-east-1.pooler.supabase.com:5432/postgres"

# We will embed the SQL directly to avoid parsing/file issues and to skip the lines that cause errors
SQL_FUNCTION = """
-- Optimization RPC: Deliver Ticket
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
"""

def apply_migration():
    print(f"--- Applying Function: deliver_ticket ---")
    
    try:
        # Connect
        print(f"Connecting to {DB_URL.split('@')[1]}...")
        conn = psycopg2.connect(DB_URL)
        conn.autocommit = True
        
        with conn.cursor() as cur:
            print("Executing SQL...")
            cur.execute(SQL_FUNCTION)
            print("Function created successfully.")
            
            # Notify PostgREST to reload schema
            print("Reloading PostgREST schema cache...")
            cur.execute("NOTIFY pgrst, 'reload schema'")
            print("Reload signal sent.")
            
            # Verify function existence
            print("Verifying function 'deliver_ticket'...")
            cur.execute("SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'deliver_ticket'")
            res = cur.fetchone()
            if res:
                 print("Function 'deliver_ticket' FOUND in schema!")
            else:
                 print("WARNING: Function 'deliver_ticket' NOT found after execution.")

        conn.close()
        
    except Exception as e:
        print(f"Migration Failed: {e}")

if __name__ == "__main__":
    apply_migration()
