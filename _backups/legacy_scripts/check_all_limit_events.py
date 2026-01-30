
import os
import asyncio
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(url, key)

async def check_all_limit_events():
    # 1. Count ALL LIMIT_UPDATE events
    print("--- Checking material_events ---")
    response = supabase.table('material_events')\
        .select('*', count='exact')\
        .eq('event_type', 'LIMIT_UPDATE')\
        .execute()
    
    print(f"Total LIMIT_UPDATE events in DB: {len(response.data)}")
    for e in response.data[:5]:
        print(f" - ID: {e['id']} | MatID: {e['material_id']} | Notes: {e['notes'][:50]}...")

    # 2. Check Materials marked as 'Modification'
    print("\n--- Checking Materials with 'Modification' status ---")
    mat_response = supabase.table('materials')\
        .select('id, name, part_number, action_type')\
        .eq('action_type', 'Modification')\
        .execute()
    
    modified_materials = mat_response.data
    print(f"Total materials with action_type='Modification': {len(modified_materials)}")

    # 3. Correlate
    print("\n--- Correlation Check ---")
    event_mat_ids = {e['material_id'] for e in response.data}
    
    for mat in modified_materials:
        has_history = mat['id'] in event_mat_ids
        print(f"Material: {mat['name']} (ID: {mat['id']}) -> Has History Event? {'[YES]' if has_history else '[NO]'}")

if __name__ == "__main__":
    asyncio.run(check_all_limit_events())
