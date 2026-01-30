import os
import sys
from supabase import create_client, Client

URL = "https://bykumuizmxsclsazeych.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5a3VtdWl6bXhzY2xzYXpleWNoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTM4NTg0NCwiZXhwIjoyMDgwOTYxODQ0fQ.981IQNWujW7dld8tWqaG-7J18o1BI4AWKuqi0banvDA"

supabase: Client = create_client(URL, SERVICE_KEY)

def fix_data():
    print("Fixing User Roles...")
    # Force user.test to 'user' role
    try:
        res = supabase.table("profiles").update({"role": "user"}).eq("email", "user.test@wasion.cn").execute()
        print(f"Updated role for user.test: {res.data}")
    except Exception as e:
        print(f"Error updating role: {e}")

    print("\nChecking inventory_movements columns...")
    # To check schema, we might try to insert dummy to see error or select * limit 1
    try:
        res = supabase.table("inventory_movements").select("*").limit(1).execute()
        if res.data:
            print(f"Columns: {res.data[0].keys()}")
        else:
            print("No data to infer columns. Trying error method...")
    except Exception as e:
        print(f"Error checking columns: {e}")

if __name__ == "__main__":
    fix_data()
