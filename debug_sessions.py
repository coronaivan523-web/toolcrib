
import os
import sys

# Add parent directory to path so we can import 'app'
# Assuming this script is at root of toolcrib
sys.path.append(os.getcwd())

from app.core.supabase import supabase_admin

def check_sessions():
    try:
        res = supabase_admin.table('cycle_count_sessions').select('*').order('created_at', desc=True).execute()
        print(f"Total Sessions in DB: {len(res.data)}")
        for s in res.data:
            print(f"ID: {s['id']}, Created: {s['created_at']}, Status: {s['status']}, User: {s['created_by']}")
    except Exception as e:
        print(f"Error checking DB: {e}")

if __name__ == "__main__":
    check_sessions()
