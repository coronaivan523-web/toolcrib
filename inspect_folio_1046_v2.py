import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load explicitly from the current directory .env
load_dotenv('.env')

url = os.getenv("VITE_SUPABASE_URL")
key = os.getenv("VITE_SUPABASE_ANON_KEY")

if not url or not key:
    print("Error: Supabase credentials (VITE_SUPABASE_URL/ANON_KEY) not found in .env")
    # For debugging, print keys found (mask them)
    # print(os.environ.keys())
    exit(1)

supabase: Client = create_client(url, key)

def inspect_folio():
    print("--- Inspecting Folio 1046 ---")
    
    try:
        # 1. Get ticket
        print("Fetching ticket 1046...")
        ticket_res = supabase.table('tickets').select('*').eq('folio', 1046).execute()
        
        if not ticket_res.data:
            print("Ticket 1046 not found.")
            return

        ticket = ticket_res.data[0]
        ticket_id = ticket['id']
        print(f"Ticket Found: ID={ticket_id}, Status={ticket.get('status')}")

        # 2. Get items
        print("Fetching items...")
        items_res = supabase.table('ticket_items').select('*').eq('ticket_id', ticket_id).execute()
        
        if not items_res.data:
            print("No items found.")
            return

        print(f"Found {len(items_res.data)} items.")
        for item in items_res.data:
            print(f"Item ID: {item.get('id')}")
            print(f"  Material ID: {item.get('material_id')}")
            print(f"  Status: {item.get('item_status')}") # Note: code uses item_status or status
            print(f"  Cancelled By: {item.get('cancelled_by')}")
            print(f"  Cancelled At: {item.get('cancelled_at')}")
            print("-" * 20)

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    inspect_folio()
