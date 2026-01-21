
import asyncio
from app.core.supabase import supabase_admin, supabase

async def diagnose():
    print("Diagnosing Material ID 1 History...")
    client = supabase_admin if supabase_admin else supabase
    
    # 1. Fetch Material
    print("Fetching Material with ID 1...")
    mat = client.table("materials").select("*").eq("id", 1).execute()
    print(f"Material: {mat.data}")

    # 2. Fetch Movements
    print("Fetching Movements for Material ID 1...")
    moves = client.table("inventory_movements").select("*").eq("material_id", 1).order("timestamp", desc=True).execute()
    
    if not moves.data:
        print("No movements found.")
    else:
        print(f"Found {len(moves.data)} movements.")
        for m in moves.data:
            print(f"- Type: {m.get('movement_type')}, Qty: {m.get('quantity_change')}, RefType: {m.get('reference_type')}, RefID: {m.get('reference_id')}")

if __name__ == "__main__":
    asyncio.run(diagnose())
