import os
import sys
from supabase import create_client, Client

# Hardcoded credentials from .env (for debugging purpose)
url = "https://bykumuizmxsclsazeych.supabase.co"
# Using SERVICE_KEY to ensure we have permissions to see everything, 
# although the error is likely schema cache, not permissions.
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5a3VtdWl6bXhzY2xzYXpleWNoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTM4NTg0NCwiZXhwIjoyMDgwOTYxODQ0fQ.981IQNWujW7dld8tWqaG-7J18o1BI4AWKuqi0banvDA"

print(f"Connecting to {url}...")
try:
    supabase: Client = create_client(url, key)
except Exception as e:
    print(f"Failed to create client: {e}")
    sys.exit(1)

print("Attempting to select 'quantity_change' from inventory_movements...")

try:
    # Try to select the specific column to trigger the error if missing from cache
    response = supabase.table("inventory_movements").select("quantity_change").limit(1).execute()
    print("Success! Column found/accessible.")
    print(f"Data sample: {response.data}")
except Exception as e:
    print("\n[FAILURE] Could not access 'quantity_change' column.")
    print(f"Error Type: {type(e).__name__}")
    print(f"Error: {e}")
    
    # Try to inspect the error details if available
    try:
        # Pydantic or Request error might have response/details
        if hasattr(e, 'code'): print(f"Code: {e.code}")
        if hasattr(e, 'details'): print(f"Details: {e.details}")
        if hasattr(e, 'message'): print(f"Message: {e.message}")
    except:
        pass
        
    print("\nChecking what columns ARE visible...")
    try:
        # Select * to see what comes back (PostgREST usually returns all visible columns)
        res_all = supabase.table("inventory_movements").select("*").limit(1).execute()
        if res_all.data and len(res_all.data) > 0:
            print(f"Visible keys in first row: {list(res_all.data[0].keys())}")
        else:
            print("Table accessible but empty or no data returned.")
    except Exception as e2:
        print(f"Failed to fetch * as well: {e2}")
