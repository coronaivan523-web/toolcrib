import os
import uuid
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

URL = os.getenv("VITE_SUPABASE_URL") or os.getenv("SUPABASE_URL")
KEY = os.getenv("VITE_SUPABASE_ANON_KEY") or os.getenv("SUPABASE_KEY")

if not URL or not KEY:
    print("Missing credentials")
    exit(1)

supabase = create_client(URL, KEY)

EMAIL = "admin@toolcrib.com"
PASSWORD = "ivan123"

def run_test():
    print(f"Logging in as {EMAIL}...")
    auth = supabase.auth.sign_in_with_password({"email": EMAIL, "password": PASSWORD})
    
    if not auth.user:
        print("Login failed")
        return

    print("Login successful.")
    
    # Create Material
    sku = f"TEST-{uuid.uuid4().hex[:6]}"
    payload = {
        "sku": sku,
        "name": "Test Material RLS",
        "category": "Test",
        "unit_of_measure": "unit",
        "min_stock": 1,
        "max_stock": 10
    }
    
    print(f"Creating material {sku}...")
    res = supabase.from_("materials").insert(payload).execute()
    
    if not res.data:
        print("Insert returned no data (Checking if Insert worked via select...)")
    else:
        print("Insert returned data (Optimistic return works)")

    # Force Select
    print("Attempting to SELECT the material...")
    select_res = supabase.from_("materials").select("*").eq("sku", sku).execute()
    
    if select_res.data and len(select_res.data) > 0:
        print("SUCCESS: Material is visible!")
    else:
        print("FAILURE: Material is NOT visible. RLS is likely blocking SELECT.")

if __name__ == "__main__":
    run_test()
