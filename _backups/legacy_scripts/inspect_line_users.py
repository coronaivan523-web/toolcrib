
import os
import sys
from supabase import create_client

sys.path.append(os.getcwd())
from app.core.config import settings

def inspect_line_users():
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    
    TICKET_ID = 'C2026-000001'
    print(f"\n--- Inspecting Users for Session {TICKET_ID} ---")
    
    # 1. Get Session
    sess_res = supabase.table('cycle_count_sessions').select('id, ticket_id, assigned_to').eq('ticket_id', TICKET_ID).single().execute()
    if not sess_res.data:
        print("Session not found!")
        return
        
    session_id = sess_res.data['id']
    assigned_to = sess_res.data['assigned_to']
    print(f"Session Assigned To: {assigned_to}")
    
    # 2. Get Lines
    lines_res = supabase.table('cycle_count_lines').select('*').eq('session_id', session_id).execute()
    
    print(f"Found {len(lines_res.data)} lines.")
    for line in lines_res.data:
        print(f"Line ID: {line['id']}")
        print(f" - Material: {line['material_id']}")
        print(f" - Counted By: {line.get('counted_by')}")
        print(f" - Status: {line.get('status')}")

if __name__ == "__main__":
    inspect_line_users()
