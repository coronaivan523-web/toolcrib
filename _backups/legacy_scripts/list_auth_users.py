
import os
import sys
sys.path.append(os.getcwd())
from app.core.supabase import supabase_admin

def list_auth():
    if not supabase_admin:
        print("No Admin Key")
        return

    try:
        res = supabase_admin.auth.admin.list_users()
        # Handle list vs object
        users = res if isinstance(res, list) else (getattr(res, 'users', []) if hasattr(res, 'users') else [])
        
        print(f"Total Auth Users: {len(users)}")
        for u in users:
            print(f"Auth User: {u.id} | {u.email}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    list_auth()
