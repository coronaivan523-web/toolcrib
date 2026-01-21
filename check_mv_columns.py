import os
import json
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY")

if not url or not key:
    print("Error: Missing env vars or .env not loaded")
    # Try hardcoded or loading specific .env if needed, but for now rely on load_dotenv
    # Assuming user is in toolcrib dir
    exit(1)

supabase: Client = create_client(url, key)

try:
    # Check one row from inventory_movements to see all columns
    response = supabase.table("inventory_movements").select("*").limit(1).execute()
    if response.data:
        print("Columns in inventory_movements:")
        print(list(response.data[0].keys()))
    else:
        print("No rows in inventory_movements, cannot check columns easily via select *")
        
except Exception as e:
    print(f"Error checking columns: {e}")
