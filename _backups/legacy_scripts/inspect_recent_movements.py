
import os
import sys
from supabase import create_client

sys.path.append(os.getcwd())
from app.core.config import settings

def inspect_recent():
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    
    print("\n--- Last 5 Inventory Movements ---")
    try:
        # Fetch last 5
        res = supabase.table('inventory_movements').select('*').order('timestamp', desc=True).limit(5).execute()
        
        if not res.data:
            print("No movements found.")
        else:
            for m in res.data:
                print(f"ID: {m.get('id')} | Ref: {m.get('reference_type')} | Qty: {m.get('quantity')} | QtyChange: {m.get('quantity_change')} | MatID: {m.get('material_id')}")
                
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    inspect_recent()
