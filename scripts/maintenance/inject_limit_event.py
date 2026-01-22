
import os
import asyncio
from supabase import create_client, Client
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(url, key)

async def inject_limit_event():
    # 1. Find the material
    response = supabase.from_('materials').select('*').ilike('part_number', '%Eje-001%').execute()
    
    if not response.data:
        print("Material Eje-001 not found.")
        return

    material = response.data[0]
    material_id = material['id']
    print(f"Material Found: {material['name']} (ID: {material_id})")
    
    # 2. Get a user ID (Ivan's)
    user_resp = supabase.table('profiles').select('id').eq('email', 'Ivan.Corona@wasion-gto.com').execute()
    if user_resp.data:
        user_id = user_resp.data[0]['id']
    else:
        # Fallback to any user or create one... or just null if allowed (usually not for UUID)
        # Check current user from auth? No, this is script.
        # Let's just list profiles and pick one.
        profiles = supabase.table('profiles').select('id').limit(1).execute()
        user_id = profiles.data[0]['id'] if profiles.data else None

    if not user_id:
        print("No user found to attribute event to.")
        return

    # 3. Insert Fake Event
    event_data = {
        'material_id': material_id,
        'event_type': 'LIMIT_UPDATE',
        'performed_by': user_id,
        'notes': 'Min: 5 -> 10, Max: 50 -> 60, Justification: Test Audit Injection',
        'created_at': datetime.now().isoformat(),
        'modifier_name': 'Test Script',
        'modifier_position': 'Debugger',
        'modifier_area': 'IT'
    }

    try:
        resp = supabase.table('material_events').insert(event_data).execute()
        print("Event Injected Successfully:", resp.data)
    except Exception as e:
        print("Error injecting event:", e)

if __name__ == "__main__":
    asyncio.run(inject_limit_event())
