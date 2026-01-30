import os
import sys
from supabase import create_client, Client

# Hardcoded Service Key found in backup
URL = "https://bykumuizmxsclsazeych.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5a3VtdWl6bXhzY2xzYXpleWNoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTM4NTg0NCwiZXhwIjoyMDgwOTYxODQ0fQ.981IQNWujW7dld8tWqaG-7J18o1BI4AWKuqi0banvDA"

supabase: Client = create_client(URL, SERVICE_KEY)

USERS = [
    {"email": "ivan.corona@wasion.cn", "pass": "Wasion2024!"},
    {"email": "user.test@wasion.cn", "pass": "123456"}
]

def prepare_users():
    print("Listing users...")
    try:
        users = supabase.auth.admin.list_users()
        user_map = {u.email: u.id for u in users}
        
        for u in USERS:
            email = u["email"]
            pwd = u["pass"]
            
            if email in user_map:
                print(f"Updating password for {email}...")
                supabase.auth.admin.update_user_by_id(user_map[email], {"password": pwd, "email_confirm": True})
            else:
                print(f"Creating user {email}...")
                supabase.auth.admin.create_user({"email": email, "password": pwd, "email_confirm": True})
        
        print("Users verified/updated.")
        
    except Exception as e:
        print(f"Error preparing users: {e}")

if __name__ == "__main__":
    prepare_users()
