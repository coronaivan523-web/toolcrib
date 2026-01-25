
import os
import sys
from supabase import create_client

sys.path.append(os.getcwd())
from app.core.config import settings

def verify_insert():
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    
    print("\n--- Verifying Insert with New Columns ---")
    payload = {
        "material_id": 16, # Assuming ID 16 exists, or use a safe one. Using a dummy or trying to fetch one first is safer.
        "quantity": 1,
        "quantity_change": 1,
        "new_stock_level": 10,
        "previous_stock_level": 9,
        "movement_type": "IN",
        "reference_type": "CYCLE_COUNT",
        "notes": "Schema Verification Test",
        "created_by": "00000000-0000-0000-0000-000000000000"
    }
    
    try:
        # First get a valid material ID
        mat = supabase.table('materials').select('id').limit(1).execute()
        if mat.data:
            payload['material_id'] = mat.data[0]['id']
        
        print(f"Attempting insert for Material ID: {payload['material_id']}...")
        res = supabase.table('inventory_movements').insert(payload).execute()
        print("SUCCESS: Record inserted. Schema is correct.")
        
        # Cleanup
        if res.data:
            supabase.table('inventory_movements').delete().eq('id', res.data[0]['id']).execute()
            print("Cleanup done.")
            
    except Exception as e:
        print(f"FAILURE: Insert failed. Reason: {e}")

if __name__ == "__main__":
    verify_insert()
