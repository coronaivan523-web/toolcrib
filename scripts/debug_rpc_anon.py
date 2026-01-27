
import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(r"C:\Users\Ivan.Corona\.gemini\antigravity\scratch\toolcrib\.env")

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY") # ANON KEY

if not url or not key:
    print("Error: Credentials not found")
    sys.exit(1)

print(f"--- Testing deliver_ticket using ANON KEY ---")
supabase: Client = create_client(url, key)

TICKET_ID = 1033 # From latest screenshot
# Need a valid User ID (UUID)
# Just use a placeholder valid UUID if we don't know one, or fetch one if we have permission (Anon might not read profiles)
# Hardcode known UUID from previous logs if possible: cbed9b30-d6a1-44a2-99cc-d8431a875659 (Ana Maria)
USER_ID = 'cbed9b30-d6a1-44a2-99cc-d8431a875659'

try:
    print(f"Calling RPC logic with Ticket {TICKET_ID}...")
    rpc_res = supabase.rpc('deliver_ticket', {
        'p_ticket_id': int(TICKET_ID),
        'p_user_id': USER_ID
    }).execute()
    
    print("RPC Success!")
except Exception as e:
    print(f"RPC FAILED: {type(e).__name__}")
    print(f"Detail: {e}")
