
import os
import sys
sys.path.append(os.getcwd())
import json
from datetime import datetime
from uuid import UUID

# Custom encoder
class Encoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, UUID): return str(obj)
        if isinstance(obj, datetime): return str(obj)
        return str(obj)

from app.core.supabase import supabase_admin, supabase

def check_recent_save():
    client = supabase_admin if supabase_admin else supabase
    print("--- Checking RECENT Session & Lines ---")
    
    # 1. Get latest session
    res = client.table('cycle_count_sessions').select('*').order('created_at', desc=True).limit(1).execute()
    if not res.data:
        print("NO SESSIONS FOUND.")
        return

    session = res.data[0]
    s_id = session['id']
    print(f"Session ID: {s_id}")
    print(f"Assignee: {session.get('assigned_to')}")
    print(f"Planned Date: {session.get('planned_date')}")
    print(f"Created At: {session.get('created_at')}")

    # 2. Get Lines
    lines_res = client.table('cycle_count_lines').select('*').eq('session_id', s_id).execute()
    lines = lines_res.data
    print(f"Total Lines: {len(lines)}")
    for line in lines:
        print(f" - MatID: {line.get('material_id')} | Qty: {line.get('qty_physical')}")

if __name__ == "__main__":
    check_recent_save()
