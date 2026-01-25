
import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_KEY")

if not url or not key:
    print("Error: Supabase credentials not found in .env")
    sys.exit(1)

supabase: Client = create_client(url, key)

def check_recent_movements():
    # 1. Find the material "Test Drill Bit"
    print("Searching for material 'Test Drill Bit'...")
    res = supabase.table('materials').select('id, name, part_number').ilike('name', '%Test Drill Bit%').execute()
    
    if not res.data:
        print("Material not found.")
        return

    material = res.data[0]
    print(f"Found Material: {material['name']} (ID: {material['id']})")

    # 2. Get last 5 movements
    print("\nFetching last 5 movements...")
    moves = supabase.table('inventory_movements')\
        .select('*')\
        .eq('material_id', material['id'])\
        .order('timestamp', desc=True)\
        .limit(5)\
        .execute()

    if not moves.data:
        print("No movements found.")
        return

    print("\nRecent Movements:")
    print("-" * 80)
    print(f"{'ID':<10} | {'Type':<15} | {'Ref Type':<15} | {'Qty Change':<10} | {'TimeStamp'}")
    print(f"{'Notes'}")
    print("-" * 80)
    
    for m in moves.data:
        q_change = m.get('quantity_change', 'N/A')
        if q_change is None:
             q_change = m.get('quantity', 'N/A')
             
        print(f"{m.get('id', '?'):<10} | {m.get('movement_type', '?'):<15} | {m.get('reference_type', '?'):<15} | {str(q_change):<10} | {m.get('timestamp', '?')}")
        print(f"Notes: {m.get('notes', '')}")
        print("-" * 80)

if __name__ == "__main__":
    check_recent_movements()
