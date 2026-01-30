
import os
import sys
from supabase import create_client

sys.path.append(os.getcwd())
from app.core.config import settings

def patch_history_user():
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    
    TICKET_ID = 'C2026-000001'
    print(f"\n--- Patching History User for Session {TICKET_ID} ---")
    
    # 1. Get Session ID
    sess_res = supabase.table('cycle_count_sessions').select('id, ticket_id').eq('ticket_id', TICKET_ID).single().execute()
    if not sess_res.data:
        print("Session not found!")
        return
    
    # 2. Get Lines (Filter in Python to avoid UUID syntax error with 'null')
    lines_res = supabase.table('cycle_count_lines').select('id, counted_by').eq('session_id', sess_res.data['id']).execute()
    
    count = 0
    for line in lines_res.data:
        line_id = line['id']
        user_id = line.get('counted_by')

        if not user_id:
             continue
        
        # 3. Find Movement by Notes containing Line ID
        # Since we stored [RefLine:uuid] in notes
        print(f"Checking Line {line_id} (User: {user_id})")
        
        move_res = supabase.table('inventory_movements')\
            .select('id')\
            .ilike('notes', f'%{line_id}%')\
            .execute()
            
        if move_res.data:
            for move in move_res.data:
                print(f" -> Updating Movement {move['id']} with User {user_id}")
                try:
                    supabase.table('inventory_movements')\
                        .update({'created_by': user_id})\
                        .eq('id', move['id'])\
                        .execute()
                    count += 1
                except Exception as e:
                    print(f"    FAILED: {e}")
        else:
            print(" -> No movement found matching criteria.")

    print(f"\nSUCCESS: Updated {count} movements.")

if __name__ == "__main__":
    patch_history_user()
