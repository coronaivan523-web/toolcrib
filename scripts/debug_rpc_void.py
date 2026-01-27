
import os
import sys
import json
from supabase import create_client, Client
from dotenv import load_dotenv

# Try to load env
load_dotenv(r"C:\Users\Ivan.Corona\.gemini\antigravity\scratch\toolcrib\.env")

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY")

if not url or not key:
    print("Error: Credentials not found")
    sys.exit(1)

supabase: Client = create_client(url, key)

TICKET_ID = 1031 # From latest screenshot
# Get a user ID
res = supabase.table('profiles').select('id').limit(1).execute()
USER_ID = res.data[0]['id']

print(f"--- Testing deliver_ticket({TICKET_ID}, {USER_ID}) [Expect Invalid Request if Void fails client] ---")

try:
    # Mimic tickets.py exactly
    rpc_res = supabase.rpc('deliver_ticket', {
        'p_ticket_id': int(TICKET_ID),
        'p_user_id': str(USER_ID)
    }).execute()
    
    print("RPC Success!")
    print(f"Data: {rpc_res.data}")
except Exception as e:
    print(f"RPC FAILED with Exception: {type(e).__name__}")
    print(f"Detail: {e}")
