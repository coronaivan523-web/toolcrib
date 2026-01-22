
import asyncio
import uuid
from app.services.cycle_count_service import CycleCountService
from app.schemas.cycle_count import CycleCountSessionCreate, CycleCountLineCreate

async def reproduce():
    print("--- START REPRODUCTION ---")
    
    # Fetch valid user from PROFILES (public table linked to auth.users)
    from app.core.supabase import supabase_admin
    user_res = supabase_admin.table('profiles').select('id').limit(1).execute()
    if not user_res.data:
        print("No users found in PROFILES table")
        return
    user_id = user_res.data[0]['id']
    print(f"Using User ID: {user_id}")

    # Fetch valid material
    mat_res = supabase_admin.table('materials').select('id').limit(1).execute()
    if not mat_res.data:
        print("No materials found in DB")
        return
    mat_id = mat_res.data[0]['id']
    print(f"Using Material ID: {mat_id}")
    
    # Need a valid material ID. Let's list one active line first to get a valid mat id if possible, 
    # or just assume one. Better to fetch catalog first? 
    # Actually, let's just use a hardcoded safe one or try to fetch.
    
    print("1. Creating Session...")
    session_data = CycleCountSessionCreate(
        planned_date="2026-12-31",
        assigned_to=uuid.UUID(user_id) # Valid user
    )
    
    try:
        session = CycleCountService.create_session(session_data, user_id)
        print(f"Session Created: {session['id']}")
        
        print("2. Adding Line...")
        line_data = CycleCountLineCreate(
            material_id=mat_id,
            qty_physical=None
        )
        line = CycleCountService.add_line(session['id'], line_data, user_id)
        print(f"Line Created: {line['id']}")
        
        print("3. Fetching Active Lines...")
        active_lines = CycleCountService.get_active_lines()
        
        print(f"Active Lines Found: {len(active_lines)}")
        
        # Search for our line
        found = False
        for l in active_lines:
            if str(l['id']) == str(line['id']):
                found = True
                print(">>> SUCCESS: Line found in active_lines!")
                print(f"    Line Data: {l}")
                if 'session' in l and l['session']:
                     print(f"    Linked Session: {l['session']}")
                else:
                     print(">>> FAILURE: Session object MISSING or None in active_lines result!")
                break
        
        if not found:
            print(">>> FAILURE: Line NOT found in active_lines!")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_mat_id = 11051 # Based on previous logs or guesswork, need a valid ID.
    # Let's try to get a valid material first
    try:
        from app.services.material_service import MaterialService
        # Assuming get_catalog exists? Or direct DB?
        # Let's just try 92.
        pass
    except:
        pass
        
    asyncio.run(reproduce())
