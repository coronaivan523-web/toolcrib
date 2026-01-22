
import asyncio
from app.core.config import settings
from supabase import create_client

# Use Service Key to bypass RLS for this update
supabase_admin = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

EMAIL = "ivan.corona@wasion.cn"

def fix_admin_role():
    print(f"Checking profile for: {EMAIL}")
    
    # 1. Get current profile
    res = supabase_admin.table('profiles').select('*').eq('email', EMAIL).execute()
    
    if not res.data:
        print("Profile not found!")
        # Try alternate email just in case
        res = supabase_admin.table('profiles').select('*').eq('email', 'ivan.corona@wasion.com').execute()
        if not res.data:
            print("Alternate email also not found.")
            return

    profile = res.data[0]
    print(f"Current Role: {profile.get('role')}")
    
    # 2. Update to 'admin'
    if profile.get('role') != 'admin':
        print("Updating role to 'admin'...")
        update_res = supabase_admin.table('profiles').update({'role': 'admin'}).eq('id', profile['id']).execute()
        if update_res.data:
            print("SUCCESS: Role updated to 'admin'.")
            print("Frontend RLS check should now pass.")
        else:
            print("FAILURE: Update returned no data.")
    else:
        print("Role is already 'admin'. RLS issue might be elsewhere?")

if __name__ == "__main__":
    fix_admin_role()
