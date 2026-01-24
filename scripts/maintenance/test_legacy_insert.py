import os
import sys
from supabase import create_client, Client

url = "https://bykumuizmxsclsazeych.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5a3VtdWl6bXhzY2xzYXpleWNoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTM4NTg0NCwiZXhwIjoyMDgwOTYxODQ0fQ.981IQNWujW7dld8tWqaG-7J18o1BI4AWKuqi0banvDA"

print(f"Connecting to {url}...")
try:
    supabase: Client = create_client(url, key)
except Exception as e:
    print(f"Failed to create client: {e}")
    sys.exit(1)

print("Attempting LEGACY INSERT into inventory_movements...")

payload = {
    # Assuming material_id=1 exists
    "material_id": 1,
    "quantity": 1,
    "movement_type": "IN", # Valid Enum
    "notes": "Test Insert from Script (Ref: TEST-001)",
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
