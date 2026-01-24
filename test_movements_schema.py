
import os
import sys
from supabase import create_client

# Add app directory to path
sys.path.append(os.getcwd())

from app.core.config import settings

def test_insert():
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    
    print("Testing insertion into inventory_movements...")
    
    # Try with all fields
    payload = {
        "material_id": 16, # Assuming ID 16 exists or use a valid one? Let's check materials first
        "quantity_change": 1,
        "new_stock_level": 100,
        "previous_stock_level": 99,
        "movement_type": "CYCLE_COUNT",
        "reason": "Test Insert Script",
        "created_by": "00000000-0000-0000-0000-000000000000" # Dummy UUID? Validation might fail.
    }
    
    # 1. Get a valid material
    mat = supabase.table('materials').select('id').limit(1).execute()
    if not mat.data:
        print("No materials found to test with.")
        return
        
    payload['material_id'] = mat.data[0]['id']
    
    # 2. Get a valid user? Or try without created_by if nullable (it is nullable in schema ref?)
    # Schema says: created_by uuid references auth.users(id)
    # If we use a fake UUID it might fail FK constraint.
    # Let's try to find a user.
    try:
        # Users table not directly accessible usually via client if RLS... but service role can.
        # auth.users is hard to query.
        # Let's try skipping created_by for now or use one from profiles if we can find mapped id.
        users = supabase.table('profiles').select('id').limit(1).execute()
        if users.data:
            payload['created_by'] = users.data[0]['id']
        else:
            del payload['created_by']
    except:
        del payload['created_by']

    try:
        res = supabase.table('inventory_movements').insert(payload).execute()
        print("SUCCESS: Inserted record:", res.data)
        
        # Cleanup
        if res.data:
            rec_id = res.data[0]['id']
            supabase.table('inventory_movements').delete().eq('id', rec_id).execute()
            print("Cleanup successful.")
            
    except Exception as e:
        print(f"FAILURE: {e}")
        # Try to print more details
        if hasattr(e, 'details'):
            print(f"Details: {e.details}")
        if hasattr(e, 'hint'):
            print(f"Hint: {e.hint}")

if __name__ == "__main__":
    test_insert()
