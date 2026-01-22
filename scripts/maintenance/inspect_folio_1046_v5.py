import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv('.env')

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_KEY")

if not url or not key:
    exit(1)

supabase: Client = create_client(url, key)

def inspect_folio():
    print("--- Inspeccionando Folio 1046 (Detalles) ---")
    try:
        # 1. Ticket Header
        ticket = supabase.table('tickets').select('*').eq('folio', 1046).single().execute()
        t_data = ticket.data
        print(f"Ticket ID: {t_data['id']}")
        print(f"Ticket Status: {t_data['status']}")
        print(f"Ticket Cancelled At: {t_data.get('cancelled_at')}")
        
        # 2. Items
        items = supabase.table('ticket_items').select('*, material:materials(name)').eq('ticket_id', t_data['id']).execute()
        for item in items.data:
            print(f"Item ID: {item['id']}")
            print(f"  Material: {item['material']['name']}")
            print(f"  Item Status: {item['item_status']}")
            print(f"  Cancelled By (Item): {item.get('cancelled_by')}")
            print("-" * 10)

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    inspect_folio()
