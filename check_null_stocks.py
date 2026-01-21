
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

def check_null_stocks():
    print("--- Checking for Materials with NULL current_stock ---")
    try:
        # Check for NULL current_stock
        res = supabase.table('materials').select('id, part_number, name, current_stock').is_('current_stock', 'null').execute()
        
        if res.data:
            print(f"FOUND {len(res.data)} materials with NULL stock!")
            for m in res.data[:10]:
                print(f" - {m['part_number']}: {m['current_stock']}")
        else:
            print("No materials with NULL stock found.")

        # Also check for empty string or other anomalies if needed, but NULL is the likely culprit of 'None' update
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_null_stocks()
