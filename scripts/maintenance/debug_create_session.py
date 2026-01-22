
import os
import sys
from uuid import uuid4
from dotenv import load_dotenv

# Add project root to path
sys.path.append(os.getcwd())

from app.services.cycle_count_service import CycleCountService
from app.schemas.cycle_count import CycleCountSessionCreate

load_dotenv('.env')

def test_create():
    print("--- Testing Session Creation ---")
    try:
        # Get a real user ID
        from app.core.supabase import supabase_admin
        u_res = supabase_admin.table('profiles').select('id').limit(1).single().execute()
        user_id = u_res.data['id'] if u_res.data else str(uuid4())
        print(f"User ID: {user_id}")
        
        data = CycleCountSessionCreate(
            planned_date="2026-03-01",
            assigned_to=user_id 
        )
        
        print("Attempting to create session...")
        res = CycleCountService.create_session(data, user_id)
        print("SUCCESS!")
        print(res)
        
    except Exception as e:
        print("FAILURE!")
        print(e)
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_create()
