
import os
import sys
from datetime import datetime, date

sys.path.append(os.getcwd())
from app.core.supabase import supabase_admin, supabase

def force_insert():
    client = supabase_admin if supabase_admin else supabase
    print(f"Client Stats: Admin={bool(supabase_admin)}")

    # 1. Create Data
    # Use a known user ID (Ivan Corona from debug_profiles)
    user_id = 'be2e7284-93e6-4293-875f-356f2648753a' 
    payload = {
        "status": "DRAFT",
        "created_by": user_id,
        "planned_date": str(date.today()),
        "admin_notes": "Forced via Script"
    }

    try:
        print("Attempting INSERT...", payload)
        res = client.table('cycle_count_sessions').insert(payload).execute()
        if res.data:
            print("INSERT SUCCESS:", res.data[0])
        else:
            print("INSERT FAILED (No Data Returned)")
    except Exception as e:
        print(f"INSERT ERROR: {e}")

if __name__ == "__main__":
    force_insert()
