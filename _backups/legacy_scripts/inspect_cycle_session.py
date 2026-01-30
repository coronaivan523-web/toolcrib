import os
import sys
# Ensure app modules are found
sys.path.append(os.getcwd())

from app.core.supabase import supabase
import json

def inspect_latest_session():
    print("Fetching latest session...")
    res = supabase.table('cycle_count_sessions')\
        .select('*')\
        .order('created_at', desc=True)\
        .limit(1)\
        .execute()
    
    if not res.data:
        print("No sessions found.")
        return

    session = res.data[0]
    print(f"ID: {session.get('id')}")
    print(f"Created At: {session.get('created_at')}")
    print(f"Count Date (Raw DB Value): {session.get('count_date')}")
    
    print("-" * 30)
    print("Full Record:")
    print(json.dumps(session, indent=2))

if __name__ == "__main__":
    inspect_latest_session()
