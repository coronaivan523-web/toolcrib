import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

print("--- Checking Profiles ---")
try:
    res = supabase.from_("profiles").select("*").execute()
    for profile in res.data:
        print(f"ID: {profile.get('id')} | Email: {profile.get('email')} | Role: {profile.get('role')} | Name: {profile.get('full_name')}")
except Exception as e:
    print(f"Error fetching profiles: {e}")

print("\n--- Checking Auth Users (mock check via profiles email) ---")
# Accessing auth.users directly via client isn't standard, usually handled via admin api
user_res = supabase.auth.admin.list_users()
for user in user_res:
    print(f"Auth ID: {user.id} | Email: {user.email}")
