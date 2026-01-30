import os
import sys
from supabase import create_client, Client

from dotenv import load_dotenv
load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_KEY")

print(f"Connecting to {url}...")
try:
    supabase: Client = create_client(url, key)
except Exception as e:
    print(f"Failed to create client: {e}")
    sys.exit(1)

print("Attempting LEGACY INSERT into inventory_movements...")

payload = {
    # Material ID 4 (Test Drill Bit)
    "material_id": 4, 
    "quantity": 1,
    "movement_type": "IN", 
    "notes": "Test Insert from Script (Ref: TEST-SCRIPT-001)",
    "reference_type": "CYCLE_COUNT",
    "reference_id": None # Set to None if column is Integer and we have String
}

try:
    response = supabase.table("inventory_movements").insert(payload).execute()
    print("Success! Inserted legacy format.")
    print(response.data)
except Exception as e:
    print(f"\n[FAILURE] Insert failed.")
    print(f"Error: {e}")
    if hasattr(e, 'message'): print(f"Message: {e.message}")
