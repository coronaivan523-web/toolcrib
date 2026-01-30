
import os
import sys
from supabase import create_client

# Add app directory to path
sys.path.append(os.getcwd())

from app.core.config import settings

def check_schema():
    if not settings.SUPABASE_URL:
        print("Error: SUPABASE_URL not set")
        return

    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    
    print("\n--- Checking 'inventory_movements' Schema ---")
    try:
        # Intentionally fail to get column info from error or empty select?
        # Better: Insert dummy with all keys and see specific error, 
        # OR just try to select the specific columns and see if it errors.
        
        try:
            res = supabase.table('inventory_movements').select('previous_stock_level, new_stock_level').limit(1).execute()
            print("Columns EXIST. Result:", res.data)
        except Exception as e:
            print("Select Failed (Likely columns missing):", e)
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_schema()
