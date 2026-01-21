
import sys
import os
from datetime import date

# Add project root to path
sys.path.append(os.getcwd())

from app.services.cycle_count_service import CycleCountService
from app.schemas.cycle_count import CycleCountSessionCreate
from app.core.supabase import supabase_admin

def test_manual():
    print("--- 1. Testing GET Sessions (Relationship Check) ---")
    try:
        sessions = CycleCountService.get_sessions()
        print(f"SUCCESS: Retrieved {len(sessions)} sessions.")
        if len(sessions) > 0:
            print("Sample:", sessions[0])
    except Exception as e:
        print(f"FAIL: {e}")
        # If this fails with PGRST200, the FK fix failed.

    print("\n--- 2. Testing CREATE Session ---")
    try:
        # We need a valid user ID for 'created_by'. 
        # Let's pick the first user from the DB or a random UUID if we don't care about integrity strictly here.
        # But 'created_by' references 'profiles' now. So we need a valid profile ID.
        user_res = supabase_admin.table('profiles').select('id').limit(1).execute()
        if not user_res.data:
            print("SKIP: No profiles found to test creation.")
            return

        user_id = user_res.data[0]['id']
        print(f"Using Profile ID: {user_id}")
        
        data = CycleCountSessionCreate(
            planned_date=date.today().isoformat(),
            notes="Manual Test from Script"
        )
        
        new_session = CycleCountService.create_session(data, user_id)
        print(f"SUCCESS: Created Session {new_session['id']}")
        
    except Exception as e:
        print(f"FAIL: {e}")

if __name__ == "__main__":
    test_manual()
