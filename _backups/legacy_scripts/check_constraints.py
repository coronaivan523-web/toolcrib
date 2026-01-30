
import os
import sys
from supabase import create_client

sys.path.append(os.getcwd())
from app.core.config import settings

def check_constraints():
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    
    print("\n--- Checking Constraints for 'inventory_movements' ---")
    
    # Check created_by column nullability
    try:
        # We can't query information_schema via API easily unless exposed.
        # But we can try to insert a record with created_by=None and see error.
        
        # 1. Get valid material
        mat = supabase.table('materials').select('id').limit(1).execute()
        if not mat.data:
            print("No materials found.")
            return
        mid = mat.data[0]['id']

        payload = {
            "material_id": mid,
            "quantity": 1,
            "movement_type": "IN",
            "created_by": None # TEST NULL
        }
        
        print("Attempting Insert with created_by=None...")
        res = supabase.table('inventory_movements').insert(payload).execute()
        print("SUCCESS: created_by CAN be NULL.")
        
        # Clean up
        if res.data:
            supabase.table('inventory_movements').delete().eq('id', res.data[0]['id']).execute()

    except Exception as e:
        print(f"FAILURE (NULL User): {e}")

if __name__ == "__main__":
    check_constraints()
