import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

URL = os.getenv("VITE_SUPABASE_URL") or os.getenv("SUPABASE_URL")
KEY = os.getenv("VITE_SUPABASE_ANON_KEY") or os.getenv("SUPABASE_KEY")

supabase = create_client(URL, KEY)
EMAIL = "admin@toolcrib.com"
PASSWORD = "ivan123"

def run_test():
    print(f"Logging in...")
    auth = supabase.auth.sign_in_with_password({"email": EMAIL, "password": PASSWORD})
    if not auth.user:
        print("Login failed")
        return

    print("Attempting frontend query: select *, location:locations(code)")
    try:
        # Note: python client syntax for join might differ slightly from JS if using postgrest directly
        # But select string is passed through.
        res = supabase.from_("materials").select("*, location:locations(code)").execute()
        
        print(f"Found {len(res.data)} items.")
        if len(res.data) > 0:
            print("First item:", res.data[0])
        else:
            print("Materials list is empty (RLS blocking?)")
            
    except Exception as e:
        print(f"Query Failed: {e}")

if __name__ == "__main__":
    run_test()
