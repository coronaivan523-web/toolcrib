
import os
import sys
from supabase import create_client
import uuid

sys.path.append(os.getcwd())
try:
    from app.core.config import settings
except:
    class Settings:
        SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
        SUPABASE_SERVICE_KEY = os.getenv("VITE_SUPABASE_SERVICE_KEY")
    settings = Settings()

def verify_write():
    print("--- Verifying Write to New Columns ---")
    
    url = os.getenv("SUPABASE_URL") or settings.SUPABASE_URL
    key = os.getenv("SUPABASE_SERVICE_KEY") or settings.SUPABASE_SERVICE_KEY
    
    if not url or not key:
        print("ERROR: Credentials missing in .env")
        return

    supabase = create_client(url, key)
    
    # 1. Prepare Dummy Data
    # Get a valid material ID
    mat = supabase.table('materials').select('id').limit(1).execute()
    if not mat.data:
        print("No materials found to test.")
        return
    mat_id = mat.data[0]['id']
    
    payload = {
        "material_id": mat_id,
        "quantity": 0,
        "quantity_change": 123,      # TEST VALUE
        "new_stock_level": 456,      # TEST VALUE
        "previous_stock_level": 789, # TEST VALUE
        "movement_type": "IN",
        "reference_type": "OTHER",
        "notes": "SCHEMA_TEST_VERIFICATION_SCRIPT"
    }
    
    try:
        print(f"Attempting to insert test record with new columns...")
        res = supabase.table('inventory_movements').insert(payload).execute()
        
        if not res.data:
            print("Insert returned no data!")
            return
            
        new_row = res.data[0]
        row_id = new_row['id']
        print(f"Inserted ID: {row_id}")
        
        # 2. Verify Values
        val_change = new_row.get('quantity_change')
        val_new = new_row.get('new_stock_level')
        
        print(f"Read Back -> QtyChange: {val_change}, NewStock: {val_new}")
        
        if val_change == 123 and val_new == 456:
            print("SUCCESS! The schema cache is reloaded and columns are active.")
        else:
            print("FAILURE! The columns are still null or zero. Cache reload might have failed or not happened.")
            
        # 3. Cleanup
        print("Cleaning up test record...")
        supabase.table('inventory_movements').delete().eq('id', row_id).execute()
        print("Cleanup done.")
        
    except Exception as e:
        print(f"CRITICAL ERROR during insert: {e}")
        print("This likely means the schema cache is NOT reloaded properly (API doesn't recognize the columns).")

if __name__ == "__main__":
    verify_write()
