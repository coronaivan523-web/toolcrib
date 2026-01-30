from app.core.supabase import supabase_admin as supabase
import json

def debug_details():
    req_id = "5659958e-b2ea-4e70-826c-30aa6d5ad4b5" # REQ-2026-0061
    
    print("\n--- REQUISITION ---")
    req = supabase.table('requisitions').select('*').eq('id', req_id).single().execute()
    print(json.dumps(req.data, indent=2))

    print("\n--- APPROVALS ---")
    aps = supabase.table('requisition_approvals')\
        .select('*, approver:profiles!assigned_to_user_id(id, full_name, email)')\
        .eq('requisition_id', req_id)\
        .order('step_order')\
        .execute()
    print(json.dumps(aps.data, indent=2))

    print("\n--- PROFILES ---")
    # Get all users involved in these IDs
    uids = {req.data['requester_id']}
    for a in aps.data:
        uids.add(a['assigned_to_user_id'])
    
    profiles = supabase.table('profiles').select('id, full_name, email, role').in_('id', list(uids)).execute()
    print(json.dumps(profiles.data, indent=2))

if __name__ == "__main__":
    debug_details()
