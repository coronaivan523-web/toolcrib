
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv('.env')

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_KEY")

if not url or not key:
    print("Error: Missing env vars")
    exit(1)

supabase: Client = create_client(url, key)

def fix_null_stocks():
    print("--- Fixing materials with NULL current_stock ---")
    try:
        # Update NULL to 0
        # Check first
        res = supabase.table('materials').select('id, part_number').is_('current_stock', 'null').execute()
        ids = [m['id'] for m in res.data]
        
        if not ids:
             print("No items to fix.")
             return

        print(f"Fixing {len(ids)} items...")
        for mid in ids:
             supabase.table('materials').update({'current_stock': 0}).eq('id', mid).execute()
             print(f"Set stock to 0 for material ID: {mid}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    fix_null_stocks()
