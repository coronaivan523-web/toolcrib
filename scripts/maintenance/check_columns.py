import os
from supabase import create_client, Client

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY")

if not url or not key:
    print("Error: Missing env vars")
    exit(1)

supabase: Client = create_client(url, key)

try:
    # Try to select the specific columns. If they don't exist, this will fail.
    # We limit to 1 row for speed.
    response = supabase.table("materials").select("id, deactivation_reason, deactivated_by, deactivated_at").limit(1).execute()
    print("Columns exist. Test fetch successful.")
    print(response.data)
except Exception as e:
    print(f"Error checking columns: {e}")
