
import os
import sys
from supabase import create_client

sys.path.append(os.getcwd())
from app.core.config import settings

def check_ref_id_type():
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    
    print("\n--- Checking 'reference_id' Type via Usage ---")
    
    # Try to select reference_id from existing records
    try:
        res = supabase.table('inventory_movements').select('reference_id').limit(5).execute()
        print("Existing values:")
        for r in res.data:
            print(f" - {r.get('reference_id')} (Type: {type(r.get('reference_id'))})")
            
    except Exception as e:
        print(f"Select failed: {e}")

if __name__ == "__main__":
    check_ref_id_type()
