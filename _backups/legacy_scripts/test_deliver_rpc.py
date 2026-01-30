
import os
import sys
import json
from supabase import create_client, Client

# Use environment variables if possible, but for this script we might need to hardcode strictly for debugging if .env isn't loaded
# However, I should try to read .env or just use the service key from the user's environment if I can find it.
# Actually, I'll use the python-dotenv to load it.

from dotenv import load_dotenv

load_dotenv(r"C:\Users\Ivan.Corona\.gemini\antigravity\scratch\toolcrib\.env")

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY")

if not url or not key:
    print("Error: Message credentials not found in .env")
    sys.exit(1)

supabase: Client = create_client(url, key)

TICKET_ID = 25 # ID for Folio 1025
USER_ID = "d4c3c3a0-1234-5678-9abc-def012345678" # I need a valid user ID. 

# Let's get a valid user ID (e.g. the one assigned to the ticket or just the first admin)
res = supabase.table('profiles').select('id').limit(1).execute()
if res.data:
    USER_ID = res.data[0]['id']
    print(f"Using User ID: {USER_ID}")
else:
    print("No users found?")
    sys.exit(1)

print(f"--- Calling deliver_ticket({TICKET_ID}, {USER_ID}) ---")

try:
    resp = supabase.rpc('deliver_ticket', {
        'p_ticket_id': TICKET_ID,
        'p_user_id': USER_ID
    }).execute()
    
    print("Response:")
    print(json.dumps(resp.data, indent=2))
except Exception as e:
    print(f"RPC Error: {e}")
