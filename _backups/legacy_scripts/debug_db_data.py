from app.core.supabase import supabase_admin as supabase
import json

def debug_requisitions():
    res = supabase.table('requisitions')\
        .select('id, req_number, requester_id, requester_name, status')\
        .order('created_at', desc=True)\
        .limit(5)\
        .execute()
    
    print(json.dumps(res.data, indent=2))

if __name__ == "__main__":
    debug_requisitions()
