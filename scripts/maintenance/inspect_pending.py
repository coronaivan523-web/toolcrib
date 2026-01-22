import os
import sys
from supabase import create_client, Client

# Load env manually
env_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(env_path):
    with open(env_path, 'r') as f:
        for line in f:
            if '=' in line and not line.startswith('#'):
                key, value = line.strip().split('=', 1)
                os.environ[key] = value

# Initialize Supabase client
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY")

if not url or not key:
    print("Error: SUPABASE_URL or SUPABASE_SERVICE_KEY not set.")
    sys.exit(1)

supabase: Client = create_client(url, key)

def inspect_pending():
    print("--- Inspecting Pending Requisitions ---")
    
    # 1. Inspect 'Pru-004' (Need to find its ID first or filter by name if joined, but schema has separate tables)
    # Let's search items and join materials? Supabase-py doesn't do deep joins easily in one go without knowing IDs usually, 
    # but we can try to select.
    
    # Get material ID for 'Pru-004'
    mat_res = supabase.table('materials').select('id, part_number').eq('part_number', 'Pru-004').execute()
    if not mat_res.data:
        print("Material 'Pru-004' not found.")
    else:
        mat_id = mat_res.data[0]['id']
        print(f"Material 'Pru-004' found. ID: {mat_id}")
        
        # Find active items for this material
        # Active statuses: PENDING, UNDER_REVIEW, APPROVED, REJECTED, ORDERED
        # We need to filter based on the parent requisition status. 
        # Since we can't do complex joins easily, we'll fetch items and filter manually or fetch requisitions first.
        
        # Check 'ticket_items' (Internal Requests)
        # Active ticket statuses likely: 'pending', 'IN_PROCESS', 'READY'? 
        # Need to check 'tickets' table for status, but let's query ticket_items joined with tickets.
        
        print("\n--- Inspecting Internal Tickets (ticket_items) ---")
        tickets_res = supabase.table('ticket_items').select('*, ticket:tickets(*)').eq('material_id', mat_id).execute()
        
        pending_count_tickets = 0
        for item in tickets_res.data:
            ticket = item.get('ticket') or {}
            t_status = ticket.get('status')
            # Assuming these consume "pending" stock?
            # If status is NOT closed/delivered/cancelled
            if t_status not in ['DELIVERED', 'CANCELLED', 'CLOSED']:
                print(f" - Ticket ID: {ticket.get('id')} | Status: {t_status} | Qty: {item.get('quantity_requested')}")
                pending_count_tickets += item.get('quantity_requested', 0)
        
        print(f"Calculated Pending from Tickets: {pending_count_tickets}")

        # Check 'materials' table 'pending_stock' column directly
        print("\n--- Inspecting 'materials' table column 'pending_stock' ---")
        mat_col_res = supabase.table('materials').select('pending_stock').eq('id', mat_id).execute()
        if mat_col_res.data:
            print(f"Current 'pending_stock' value in DB: {mat_col_res.data[0].get('pending_stock')}")




if __name__ == "__main__":
    inspect_pending()
