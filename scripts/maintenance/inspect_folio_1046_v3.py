import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Cargar explícitamente desde el .env actual
load_dotenv('.env')

# Usar las claves correctas encontradas en el archivo .env
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY") # Usaremos la clave anon/public por ahora, si falla probaremos service_key

if not url or not key:
    print("Error: Credenciales de Supabase (SUPABASE_URL/SUPABASE_KEY) no encontradas en .env")
    exit(1)

supabase: Client = create_client(url, key)

def inspect_folio():
    print("--- Inspeccionando Folio 1046 ---")
    
    try:
        # 1. Obtener ticket
        print("Buscando ticket con folio 1046...")
        ticket_res = supabase.table('tickets').select('*').eq('folio', 1046).execute()
        
        if not ticket_res.data:
            print("Ticket 1046 no encontrado.")
            return

        ticket = ticket_res.data[0]
        ticket_id = ticket['id']
        print(f"Ticket Encontrado: ID={ticket_id}, Status={ticket.get('status')}")

        # 2. Obtener items del ticket
        print("Obteniendo items...")
        items_res = supabase.table('ticket_items').select('*').eq('ticket_id', ticket_id).execute()
        
        if not items_res.data:
            print("No se encontraron items para este ticket.")
            return

        print(f"Encontrados {len(items_res.data)} items.")
        for item in items_res.data:
            print(f"Item ID: {item.get('id')}")
            print(f"  Material ID: {item.get('material_id')}")
            print(f"  Status: {item.get('item_status')}") 
            print(f"  Cancellation Reason: {item.get('cancellation_reason')}")
            print(f"  Cancelled By (UUID): {item.get('cancelled_by')}") # Este es el dato crítico
            print(f"  Cancelled At: {item.get('cancelled_at')}")
            print("-" * 20)

    except Exception as e:
        print(f"Error accediendo a Supabase: {e}")

if __name__ == "__main__":
    inspect_folio()
