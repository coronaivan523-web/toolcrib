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

def fix_pending_data():
    print("--- Starting Cleanup Process ---")
    
    # 1. Reset pending_stock for all materials
    print("\n1. Resetting 'pending_stock' to 0 for all materials...")
    res = supabase.table('materials').update({'pending_stock': 0}).gt('pending_stock', 0).execute()
    print(f"   Updated {len(res.data)} materials (Pending Stock Reset).")

    # 2. Cancel all active tickets logic
    # Statuses considering "pending": 'pending', 'IN_PROCESS', 'READY'
    statuses_to_cancel = ['pending', 'IN_PROCESS', 'READY']
    
    print("\n2. Cancelling all ACTIVE tickets (pending, IN_PROCESS, READY)...")
    
    # We need to fetch IDs first to update corresponding items if needed, or just update tickets directly.
    # Updating tickets to CANCELLED
    
    # Updating tickets to CANCELLED (removing columns that might not exist based on error)
    ticket_res = supabase.table('tickets').update({
        'status': 'CANCELLED'
        # 'cancellation_reason': ... # Column apparently missing in 'tickets' table based on error
    }).in_('status', statuses_to_cancel).execute()
    
    cancelled_tickets = ticket_res.data
    print(f"   Cancelled {len(cancelled_tickets)} tickets.")
    
    if cancelled_tickets:
        ticket_ids = [t['id'] for t in cancelled_tickets]
        
        # Also update ticket_items to be consistent
        print(f"   Updating items for {len(ticket_ids)} tickets...")
        items_res = supabase.table('ticket_items').update({
            'item_status': 'cancelled',
            'cancellation_reason': 'System Cleanup - Parent Ticket Cancelled'
        }).in_('ticket_id', ticket_ids).execute()
        print(f"   Updated {len(items_res.data)} ticket items to 'cancelled'.")

    print("\n--- Cleanup Complete ---")
    
    # Verification for Pru-004
    print("\n[Verification] Checking pending_stock for 'Pru-004'...")
    mat_res = supabase.table('materials').select('id, part_number, pending_stock').eq('part_number', 'Pru-004').execute()
    if mat_res.data:
        print(f"   Material: {mat_res.data[0]['part_number']} | Pending Stock: {mat_res.data[0]['pending_stock']}")
    else:
        print("   Warning: Material Pru-004 not found (might have been deleted or just checking others).")

if __name__ == "__main__":
    fix_pending_data()
