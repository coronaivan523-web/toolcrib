
import os
import sys
from supabase import create_client

sys.path.append(os.getcwd())
from app.core.config import settings

def check_cols_minimal():
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    
    print("\n--- Minimal Column Check ---")
    try:
        # Just try to select the new column
        res = supabase.table('inventory_movements').select('previous_stock_level').limit(1).execute()
        print("SUCCESS: 'previous_stock_level' exists.")
    except Exception as e:
        print(f"FAILURE: {e}")

if __name__ == "__main__":
    check_cols_minimal()
