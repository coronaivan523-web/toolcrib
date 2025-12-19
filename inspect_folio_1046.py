import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv('c:\\Users\\Ivan.Corona\\.gemini\\antigravity\\scratch\\toolcrib\\.env')

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") # Use service role key to bypass RLS if possible for debugging

if not url or not key:
    print("Error: Supabase credentials not found in .env")
    exit(1)

supabase: Client = create_client(url, key)

def inspect_ticket_items():
    print("--- Inspecting ticket_items for Folio 1046 ---")
    
    # 1. Try to fetch one item to see columns (if simple select works)
    try:
        # Fetch items for folio 1046 (assuming folio is stored in tickets and linked, or directly in ticket_items if structure implies)
        # Actually ticket_items usually links to a ticket_id.
        # Let's first find the ticket_id for folio 1046 if possible, or just search all items if we can't link easily.
        # But wait, the user said "Folio #1046". Let's check the 'tickets' table first to get the ID.
        
        print("Fetching ticket for Folio 1046...")
        ticket_res = supabase.table('tickets').select('*').eq('folio', 1046).execute()
        
        if not ticket_res.data:
            print("Ticket with Folio 1046 not found.")
            return

        ticket = ticket_res.data[0]
        ticket_id = ticket['id']
        print(f"Found ticket: ID={ticket_id}, Folio={ticket['folio']}")

        # 2. Fetch ticket_items for this ticket
        print(f"Fetching ticket_items for ticket_id {ticket_id}...")
        items_res = supabase.table('ticket_items').select('*').eq('ticket_id', ticket_id).execute()
        
        if not items_res.data:
            print("No items found for this ticket.")
            return

        print(f"Found {len(items_res.data)} items.")
        for item in items_res.data:
            print(f"Item ID: {item.get('id')}")
            print(f"  Material ID: {item.get('material_id')}")
            print(f"  Status: {item.get('status')}")
            print(f"  Cancelled By (raw): {item.get('cancelled_by')}") # Checking if this column exists and has data
            print(f"  Quantity: {item.get('quantity')}")
            print("-" * 20)

    except Exception as e:
        print(f"Error accessing Supabase: {e}")

if __name__ == "__main__":
    inspect_ticket_items()
