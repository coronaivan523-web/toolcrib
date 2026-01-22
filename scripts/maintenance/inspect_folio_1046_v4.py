import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv('.env')

url = os.getenv("SUPABASE_URL")
# Use Service Key for full access (bypass RLS)
key = os.getenv("SUPABASE_SERVICE_KEY") 

if not url or not key:
    print("Error: Credenciales no encontradas.")
    exit(1)

supabase: Client = create_client(url, key)

def inspect_folio():
    print("--- Inspeccionando Folio 1046 (Service Key) ---")
    try:
        # Buscar el ticket
        print("Buscando ticket...")
        ticket_res = supabase.table('tickets').select('*').eq('folio', 1046).execute()
        
        if not ticket_res.data:
            print("Ticket 1046 NO encontrado incluso con Service Key.")
            # Listar últimos tickets para ver qué folios existen
            recent = supabase.table('tickets').select('folio').order('created_at', desc=True).limit(5).execute()
            print("Últimos 5 folios disponibles:", [t['folio'] for t in recent.data])
            return

        ticket = ticket_res.data[0]
        ticket_id = ticket['id']
        print(f"Ticket Encontrado: {ticket_id}")

        # Buscar items
        items_res = supabase.table('ticket_items').select('*').eq('ticket_id', ticket_id).execute()
        
        for item in items_res.data:
            print(f"Item: {item.get('id')}")
            print(f"  Material ID: {item.get('material_id')}")
            print(f"  Status: {item.get('item_status')}")
            print(f"  Cancelled By: {item.get('cancelled_by')}") # CHECK THIS
            print(f"  Cancellation Reason: {item.get('cancellation_reason')}")
            print("-" * 10)

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    inspect_folio()
