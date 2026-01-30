
import os
import sys
from supabase import create_client

# Add app directory to path
sys.path.append(os.getcwd())

from app.core.config import settings

def inspect_data():
    if not settings.SUPABASE_URL:
        print("Error: SUPABASE_URL not set")
        return

    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    
    print("\n--- Inspecting Last 5 Inventory Movements ---")
    try:
        # Fetch last 5 movements to see populated fields
        res = supabase.table('inventory_movements')\
            .select('*')\
            .order('timestamp', desc=True)\
            .limit(5)\
            .execute()
            
        for i, move in enumerate(res.data):
            print(f"\nRecord {i+1}:")
            print(f"  ID: {move.get('id')}")
            print(f"  Type: {move.get('movement_type')}")
            print(f"  Ref: {move.get('reference_type')}")
            print(f"  Qty: {move.get('quantity')}")
            print(f"  Prev Stock: {move.get('previous_stock_level')} (Type: {type(move.get('previous_stock_level'))})")
            print(f"  New Stock: {move.get('new_stock_level')} (Type: {type(move.get('new_stock_level'))})")
            print(f"  Timestamp: {move.get('timestamp')}")
            
    except Exception as e:
        print(f"Error fetching movements: {e}")

if __name__ == "__main__":
    inspect_data()
