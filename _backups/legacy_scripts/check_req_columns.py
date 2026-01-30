import os
from supabase import create_client, Client

# Load .env manually
try:
    with open(".env", "r") as f:
        for line in f:
            if "=" in line and not line.startswith("#"):
                key, val = line.strip().split("=", 1)
                os.environ[key] = val
except Exception as e:
    print(f"Warning: Could not read .env: {e}")

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY")

if not url or not key:
    print("Error: Missing env vars. Please source .env first.")
    exit(1)

supabase: Client = create_client(url, key)

try:
    print("Checking 'requisitions' table for 'created_by' column...")
    response = supabase.table("requisitions").select("id, created_by").limit(1).execute()
    print("Column 'created_by' exists!")
    print(response.data)
except Exception as e:
    print(f"Error checking columns: {e}")
