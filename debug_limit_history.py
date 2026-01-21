
import os
import asyncio
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(url, key)

async def check_limit_history():
    # 1. Find the material (Eje-001 / Tool1213)
    response = supabase.from_('materials').select('*').ilike('part_number', '%Eje-001%').execute()
    
    if not response.data:
        print("Material Eje-001 not found.")
        return

    material = response.data[0]
    material_id = material['id']
    print(f"Material Found: {material['name']} (ID: {material_id})")

    # 2. Check Events
    events_response = supabase.from_('material_events')\
        .select('*')\
        .eq('material_id', material_id)\
        .execute() # Fetch ALL events for this material first to see what's there

    events = events_response.data
    print(f"Total Events found: {len(events)}")
    
    limit_events = [e for e in events if e['event_type'] == 'LIMIT_UPDATE']
    print(f"LIMIT_UPDATE Events: {len(limit_events)}")

    for e in events:
        print(f" - ID: {e['id']}, Type: {e['event_type']}, Created: {e['created_at']}")

if __name__ == "__main__":
    asyncio.run(check_limit_history())
