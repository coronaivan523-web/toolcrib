import asyncio
import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(url, key)

async def check_movements():
    # Fetch recent IN movements for Material 2
    response = supabase.table("inventory_movements")\
        .select("*")\
        .eq("material_id", 2)\
        .eq("movement_type", "IN")\
        .order("timestamp", desc=True)\
        .limit(5)\
        .execute()
    
    print(f"Movements found: {len(response.data)}")
    for m in response.data:
        print(f"ID: {m['id']}")
        print(f"  Type: {m['movement_type']}")
        print(f"  Ref Type: {m['reference_type']}")
        print(f"  Ref ID: {m['reference_id']}")
        print(f"  Notes: {m['notes']}")
        print("-" * 20)

if __name__ == "__main__":
    asyncio.run(check_movements())
