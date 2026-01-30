import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client

# Force load .env
root_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
env_path = os.path.join(root_path, ".env")
load_dotenv(dotenv_path=env_path)

URL = os.getenv("SUPABASE_URL")
KEY = os.getenv("SUPABASE_KEY") # Anon Key is fine if RPC is SECURITY DEFINER

if not URL or not KEY:
    print("Error: Missing .env vars")
    sys.exit(1)

def check_policies():
    print(f"Connecting to: {URL}")
    client = create_client(URL, KEY)
    
    try:
        print("Calling get_system_policies()...")
        res = client.rpc("get_system_policies", {}).execute()
        
        if res.data:
            print(f"\n{'SCHEMA':<10} | {'TABLE':<20} | {'POLICY NAME':<40} | {'CMD':<10} | {'ROLES'}")
            print("-" * 100)
            for p in res.data:
                roles = str(p['roles']) if p['roles'] else "ALL"
                print(f"{p['schema_name']:<10} | {p['table_name']:<20} | {p['policy_name']:<40} | {p['cmd']:<10} | {roles}")
        else:
            print("No policies found (or RPC failed silently).")
            
    except Exception as e:
        print(f"RPC Error: {e}")

if __name__ == "__main__":
    check_policies()
