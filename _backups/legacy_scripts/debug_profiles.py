
import os
import sys
sys.path.append(os.getcwd())

from app.core.supabase import supabase_admin, supabase

def check_profiles():
    client = supabase_admin if supabase_admin else supabase
    print(f"Using Admin Client: {bool(supabase_admin)}")
    try:
        res = client.table('profiles').select('*').execute()
        print(f"Total Profiles: {len(res.data)}")
        for p in res.data:
            print(f"  - {p.get('email')} ({p.get('role')})")
    except Exception as e:
        print(f"Error checking profiles: {e}")

if __name__ == "__main__":
    check_profiles()
