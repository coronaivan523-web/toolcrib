
import asyncio
from app.core.supabase import supabase_admin

def list_profiles():
    try:
        res = supabase_admin.table('profiles').select('id, full_name, email').limit(5).execute()
        for p in res.data:
            print(p)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    list_profiles()
