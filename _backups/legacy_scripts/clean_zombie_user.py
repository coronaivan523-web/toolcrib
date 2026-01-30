
import asyncio
from app.core.config import settings
from supabase import create_client

# Admin client is needed to delete from auth
supabase_admin = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

EMAIL_TO_CLEAN = "mauricio.martinez@wasion.cn"

def clean_user():
    print(f"Searching for user: {EMAIL_TO_CLEAN}")
    
    # 1. Provide a way to find the user ID. 
    # Since we can't search auth directly easily with py-supabase without specific admin list methods (which might vary by version),
    # we can try to look at the 'profiles' table first (which is linked to auth.users usually).
    
    user_id = None
    
    # Try finding in profiles
    try:
        res = supabase_admin.table('profiles').select('id, email').eq('email', EMAIL_TO_CLEAN).execute()
        if res.data:
            user_id = res.data[0]['id']
            print(f"Found in profiles: {user_id}")
        else:
            print("Not found in 'profiles' table.")
    except Exception as e:
        print(f"Error checking profiles: {e}")

    # If not in profiles, we might need to search Auth. 
    # supabase_admin.auth.admin.list_users() is one way.
    if not user_id:
        print("Searching Auth system directly...")
        try:
            # Listing users (pagination might be needed if many users, but let's try first page)
            users = supabase_admin.auth.admin.list_users()
            for u in users:
                if u.email == EMAIL_TO_CLEAN:
                    user_id = u.id
                    print(f"Found in Auth: {user_id}")
                    break
        except Exception as e:
            print(f"Error listing auth users: {e}")

    # 2. Delete if found
    if user_id:
        print(f"Deleting user {user_id}...")
        try:
            res = supabase_admin.auth.admin.delete_user(user_id)
            print("User deleted successfully.")
        except Exception as e:
            print(f"Error deleting user: {e}")
    else:
        print("User not found. Nothing to clean.")

if __name__ == "__main__":
    clean_user()
