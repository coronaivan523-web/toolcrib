import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv('.env')

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_KEY")

if not url or not key:
    print("Error: Missing credentials")
    exit(1)

supabase: Client = create_client(url, key)

def fix_folio_1046():
    print("--- Fixing Folio 1046 ---")
    try:
        # 1. Get Ticket ID
        ticket = supabase.table('tickets').select('*').eq('folio', 1046).single().execute()
        if not ticket.data:
            print("Ticket 1046 not found")
            return
            
        ticket_id = ticket.data['id']
        requester_id = ticket.data['requester_id'] # Use requesting user as canceller (most likely scenario for self-cancellation or test)
        
        # Alternatively, try to find "supervisor.test@wasion.cn" user
        users = supabase.table('profiles').select('id').eq('email', 'supervisor.test@wasion.cn').execute()
        canceller_id = requester_id
        if users.data:
            canceller_id = users.data[0]['id']
            print("Found supervisor user, using ID:", canceller_id)
        else:
            print("Supervisor not found, failing back to requester ID:", canceller_id)

        # 2. Update Items
        print(f"Updating items for Ticket {ticket_id}...")
        res = supabase.table('ticket_items').update({
            'item_status': 'cancelled',
            'cancelled_by': canceller_id,
            'cancellation_reason': ticket.data.get('cancellation_reason') or 'Manual Fix',
            'cancelled_at': ticket.data.get('cancelled_at') or '2025-12-19T12:00:00Z'
        }).eq('ticket_id', ticket_id).execute()
        
        print("Update result:", res.data)
        print("Done.")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    fix_folio_1046()
