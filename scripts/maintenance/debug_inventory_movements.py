import os
import sys
import json
from supabase import create_client

sys.path.append(os.getcwd())
try:
    from app.core.config import settings
except:
    # Fallback for manual run if env not set
    class Settings:
        SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
        SUPABASE_SERVICE_KEY = os.getenv("VITE_SUPABASE_SERVICE_KEY")
    settings = Settings()

def debug_inventory():
    print("--- Connecting to Supabase ---")
    # Use service key to bypass potential RLS for inspection
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    
    # 1. Find Material 'Eje-001'
    print("\n--- Finding Material 'Eje-001' ---")
    mat_res = supabase.table('materials').select('id, name, current_stock').eq('part_number', 'Eje-001').execute()
    if not mat_res.data:
        print("Material NOT found.")
        return
    
    material = mat_res.data[0]
    mat_id = material['id']
    print(f"Material: {material}")
    
    # 2. Get Last Movements
    print(f"\n--- Last Movements for Material {mat_id} ---")
    mov_res = supabase.table('inventory_movements').select('*').eq('material_id', mat_id).order('timestamp', desc=True).limit(5).execute()
    
    for m in mov_res.data:
        print(f"ID: {m['id']}")
        print(f"  Type: {m.get('movement_type')} / {m.get('reference_type')}")
        print(f"  Qty: {m.get('quantity')} (Change: {m.get('quantity_change')})")
        print(f"  Created By: {m.get('created_by')}")
        print(f"  Stock: Prev={m.get('previous_stock_level')}, New={m.get('new_stock_level')}")
        print(f"  Notes: {m.get('notes')}")
        print("-" * 20)

    # 3. Simulate Insert (Dry Run check for constraints)
    # We will try to insert a dummy record and see if it fails
    # We need a valid user ID. Let's pick one from profiles.
    print("\n--- Checking Users ---")
    users = supabase.table('profiles').select('id, email').limit(1).execute()
    if users.data:
        user_id = users.data[0]['id']
        print(f"Testing with User ID: {user_id} ({users.data[0]['email']})")
        
        payload = {
            "material_id": mat_id,
            "quantity": 0,
            "quantity_change": 0,
            "new_stock_level": material['current_stock'],
            "previous_stock_level": material['current_stock'],
            "movement_type": "IN", # Even if 0
            "reference_type": "OTHER",
            "created_by": user_id,
            "notes": "DEBUG SCRIPT TEST"
        }
        
        try:
            print("Attempting test insert...")
            # res = supabase.table('inventory_movements').insert(payload).execute()
            # print("Insert SUCCESS:", res.data)
            # Cleanup?
            # supabase.table('inventory_movements').delete().eq('id', res.data[0]['id']).execute()
            print("Skipping actual insert to avoid polluting data, but if we reached here connection is fine.")
        except Exception as e:
            print(f"Insert FAILED: {e}")
            
    else:
        print("No users found to test with.")

if __name__ == "__main__":
    debug_inventory()
