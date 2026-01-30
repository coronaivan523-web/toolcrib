import os
import json
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

URL = os.getenv("VITE_SUPABASE_URL") or os.getenv("SUPABASE_URL")
KEY = os.getenv("VITE_SUPABASE_ANON_KEY") or os.getenv("SUPABASE_KEY")

supabase = create_client(URL, KEY)
EMAIL = "admin@toolcrib.com"
PASSWORD = "ivan123"

def run_test():
    print("Logging in...")
    auth = supabase.auth.sign_in_with_password({"email": EMAIL, "password": PASSWORD})
    if not auth.user:
        print("Login failed")
        return

    print("\n--- LOCATIONS ---")
    res_loc = supabase.table("locations").select("*").execute()
    locations = res_loc.data
    print(f"Found {len(locations)} locations.")
    if locations:
        print("Sample location:", locations[0])
    
    print("\n--- MATERIALS (Raw) ---")
    res_mat = supabase.table("materials").select("*").limit(5).execute()
    materials = res_mat.data
    print(f"Found {len(materials)} materials (limit 5).")
    if materials:
        for m in materials:
            print(f"ID: {m.get('id')}, Name: {m.get('name')}, LocationID: {m.get('location_id')}")

    if locations and materials:
        # Try to update the first material with the first location
        mat_id = materials[0]['id']
        loc_id = locations[0]['id']
        print(f"\nUpdating Material {mat_id} to Location {loc_id}...")
        
        try:
            update_res = supabase.table("materials").update({"location_id": loc_id}).eq("id", mat_id).execute()
            print("Update result:", update_res.data)
            
            # Now try the join query again
            print("\n--- VERIFY JOIN ---")
            res_join = supabase.from_("materials").select("*, location:locations(code)").eq("id", mat_id).execute()
            print("Join Result:", res_join.data)
            
        except Exception as e:
            print(f"Update/Verify failed: {e}")

if __name__ == "__main__":
    run_test()
