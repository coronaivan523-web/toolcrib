
import os
import sys
from supabase import create_client

sys.path.append(os.getcwd())
from app.core.config import settings

def investigate_material():
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    
    print("\n--- Investing Schema & Data for 'Eje-001' ---")
    
    # 1. Find Material ID
    print("Searching for material 'Eje-001'...")
    mat = supabase.table('materials').select('*').eq('part_number', 'Eje-001').execute()
    
    if not mat.data:
        print("Material 'Eje-001' not found!")
        return
        
    material_id = mat.data[0]['id']
    print(f"Found Material: ID={material_id}, Part={mat.data[0]['part_number']}, Stock={mat.data[0]['current_stock']}")
    
    # 2. Check Inventory Movements
    print(f"Checking movements for Material ID {material_id}...")
    moves = supabase.table('inventory_movements').select('*').eq('material_id', material_id).execute()
    
    if not moves.data:
        print("No movements found for this material.")
    else:
        print(f"Found {len(moves.data)} movements:")
        for m in moves.data:
            print(f" - [{m['timestamp']}] Type={m['movement_type']} Qty={m['quantity']} NewStock={m.get('new_stock_level')}")

    # 3. Try to Insert a TEST movement (Valid User Needed)
    # Fetch a valid user
    users = supabase.table('users').select('id').limit(1).execute()
    if not users.data:
        print("No users found to use for insert test.")
        return
        
    user_id = users.data[0]['id']
    print(f"Using User ID: {user_id}")
    
    payload = {
        "material_id": material_id,
        "quantity": 0,
        "quantity_change": 0,
        "new_stock_level": 999,
        "previous_stock_level": 999,
        "movement_type": "IN",
        "reference_type": "CYCLE_COUNT",
        "notes": "Debug Insert Test",
        "created_by": user_id
    }
    
    try:
        print("Attempting ZERO-QTY insert...")
        res = supabase.table('inventory_movements').insert(payload).execute()
        print("SUCCESS: Zero-qty record insert worked!")
        print("Result:", res.data)
        
        # Cleanup
        # supabase.table('inventory_movements').delete().eq('id', res.data[0]['id']).execute()
        # print("Cleanup done.")
        
    except Exception as e:
        print(f"FAILURE: Insert failed. Reason: {e}")

if __name__ == "__main__":
    investigate_material()
