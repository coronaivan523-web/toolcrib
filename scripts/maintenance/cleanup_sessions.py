
import os
import sys
# Ensure app modules are found
sys.path.append(os.getcwd())

from app.core.supabase import supabase_admin

def cleanup_empty_sessions():
    print("Scanning for empty sessions...")
    
    # 1. Get all sessions
    res = supabase_admin.table('cycle_count_sessions').select('id, lines:cycle_count_lines(count)').execute()
    
    if not res.data:
        print("No sessions found.")
        return

    empty_ids = []
    for s in res.data:
        # Check count of lines
        # supabase returns lines as [{'count': N}] or similar depending on select
        # actually select('id, cycle_count_lines(id)') might be easier to check length
        # Let's try the safer logic: fetch all lines, get distinct session_ids, delete sessions not in that list
        pass

    # Alternative strategy: SQL direct via migration wrapper or logic here
    # 1. Get List of Session IDs with at least 1 line
    lines_res = supabase_admin.table('cycle_count_lines').select('session_id').execute()
    active_session_ids = set(l['session_id'] for l in lines_res.data)
    
    # 2. Get All Session IDs
    all_sessions_res = supabase_admin.table('cycle_count_sessions').select('id').execute()
    all_session_ids = set(s['id'] for s in all_sessions_res.data)
    
    # 3. Diff
    ids_to_delete = list(all_session_ids - active_session_ids)
    
    print(f"Found {len(ids_to_delete)} empty sessions to delete.")
    
    if ids_to_delete:
        # Delete in batches
        for i in range(0, len(ids_to_delete), 20):
            batch = ids_to_delete[i:i+20]
            supabase_admin.table('cycle_count_sessions').delete().in_('id', batch).execute()
            print(f"Deleted batch {i//20 + 1}")

    print("Cleanup complete.")

if __name__ == "__main__":
    cleanup_empty_sessions()
