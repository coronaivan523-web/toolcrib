
import os
import sys
import json
from uuid import UUID

sys.path.append(os.getcwd())

# Mock FastAPI dependencies to reuse service logic if needed, 
# or just go direct to Supabase to see raw DB state.
from app.core.supabase import supabase_admin, supabase

# Custom encoder for UUID/Date
class Encoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, UUID): return str(obj)
        return str(obj)

def check_latest_session():
    client = supabase_admin if supabase_admin else supabase
    print("--- Checking Latest Session ---")
    
    # 1. Get latest session
    res = client.table('cycle_count_sessions').select('*').order('created_at', desc=True).limit(1).execute()
    if not res.data:
        print("NO SESSIONS FOUND in DB.")
        return

    session = res.data[0]
    s_id = session['id']
    print(f"Session ID: {s_id}")
    print(f"Status: {session['status']}")
    print(f"Created By: {session['created_by']}")
    
    # 2. Get Lines for this session
    lines_res = client.table('cycle_count_lines').select('*').eq('session_id', s_id).execute()
    lines = lines_res.data
    print(f"Total Lines: {len(lines)}")
    
    for i, line in enumerate(lines):
        print(f"  Line {i+1}: MatID={line.get('material_id')} | QtyPhys={line.get('qty_physical')} | PlannedDate={line.get('planned_date')} | CountedBy={line.get('counted_by')}")

if __name__ == "__main__":
    check_latest_session()
