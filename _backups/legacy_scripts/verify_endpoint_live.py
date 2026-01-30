import requests
import json
import sys
import os
from uuid import uuid4

# Append path to import config if needed
sys.path.append(os.getcwd())
try:
    from app.core.supabase import supabase_admin
except Exception as e:
    print(f"Warning: could not import supabase_admin: {e}")
    supabase_admin = None

def verify_endpoint():
    print("--- VERIFYING LIVE ENDPOINT ---")
    base_url = "http://localhost:8001/api/v1"
    
    # 1. Create Temp User needed for login
    email = f"verifier_{uuid4()}@example.com"
    password = "verifypassword123"
    print(f"Creating temp user: {email}")
    
    if supabase_admin:
        try:
            user_res = supabase_admin.auth.admin.create_user({
                "email": email,
                "password": password,
                "email_confirm": True
            })
            if not user_res:
                print("Failed to create user.")
                return
            user_id = user_res.user.id
             # Give role 'admin' just in case
            supabase_admin.table('profiles').update({'role': 'admin'}).eq('id', user_id).execute()
        except Exception as e:
             print(f"User creation error: {e}")
             return
    else:
        print("Cannot create user without supabase_admin access in script.")
        return

    # 2. Login to get Token
    print("Logging in to get token...")
    login_url = f"{base_url}/auth/login"
    try:
        resp = requests.post(login_url, data={"username": email, "password": password})
        if resp.status_code != 200:
            print(f"Login failed: {resp.status_code} {resp.text}")
            return
        token = resp.json()['access_token']
        print(f"Got Token.")
    except Exception as e:
        print(f"Connection error: {e}")
        return
    
    # 3. Fetch History for Material 2
    print("Fetching History for Material 2...")
    headers = {"Authorization": f"Bearer {token}"}
    hist_url = f"{base_url}/materials/2/history"
    
    try:
        r = requests.get(hist_url, headers=headers)
        if r.status_code != 200:
            print(f"Fetch History Failed: {r.status_code} {r.text}")
            return
        
        data = r.json()
        movements = data.get('movements', [])
        
        # Check specific movement (ID 27 is the one we care about for REQ-12)
        # Or just checking any REQUISITION movement
        found_enriched = False
        for m in movements:
            if m.get('reference_type') == 'REQUISITION':
                print(f"Movement {m.get('id')} - Notes: {m.get('notes')}")
                print(f"   Requester: {m.get('requester_name')}")
                print(f"   Process: {m.get('process')}")
                print(f"   Plant: {m.get('plant')}")
                
                if m.get('requester_name') == "Ivan Corona":
                    found_enriched = True
        
        if found_enriched:
            print("\n[SUCCESS] Found Ivan Corona in history details!")
        else:
            print("\n[FAILURE] Did not find enriched details.")
            
    except Exception as e:
         print(f"Request error: {e}")

if __name__ == "__main__":
    verify_endpoint()
