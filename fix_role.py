import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

URL = os.getenv("VITE_SUPABASE_URL") or os.getenv("SUPABASE_URL")
SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SERVICE_KEY:
    exit(1)

supabase = create_client(URL, SERVICE_KEY)

def fix_role():
    print("Updating role for admin@toolcrib.com to 'admin'...")
    res = supabase.from_("profiles").update({"role": "admin"}).eq("email", "admin@toolcrib.com").execute()
    print("Update result:", res.data)

if __name__ == "__main__":
    fix_role()
