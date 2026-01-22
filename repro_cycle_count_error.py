
import requests
import json
import sys
import os

# Adapt from test_api_create.py
sys.path.append(os.getcwd())
try:
    from app.core.config import settings
    from app.core.supabase import supabase_admin
except ImportError:
    print("WARNING: Could not import app modules. Make sure you are in the root directory.")
    # Fallback if running outside of context, but usually this works in this env.
    pass

from uuid import uuid4

def test_repro():
    print("Preparing Repro Cycle Count Error...")
    base_url = "http://localhost:8002/api/v1"
    
    # 1. Create Temp User (or use existing if we knew one)
    email = f"repro_cc_{uuid4()}@example.com"
    password = "testpassword123"
    print(f"Creating temp user: {email}")
    
    # Create user directly in Supabase to bypass auth endpoint if needed, 
    # but using auth endpoint is better if possible. Here we use admin client to create.
    user_res = supabase_admin.auth.admin.create_user({
        "email": email,
        "password": password,
        "email_confirm": True
    })
    
    if not user_res:
        print("Failed to create user.")
        return
        
    user_id = user_res.user.id
    print(f"User Created: {user_id}")
    
    # Give role 'admin'
    supabase_admin.table('profiles').update({'role': 'admin'}).eq('id', user_id).execute()
    
    # 2. Login
    login_url = f"{base_url}/auth/login"
    print(f"Logging in to {login_url}...")
    resp = requests.post(login_url, data={"username": email, "password": password})
    
    if resp.status_code != 200:
        print(f"Login failed: {resp.status_code} {resp.text}")
        return
        
    token = resp.json()['access_token']
    print("Got Token.")
    
    # 3. Trigger 500 Error
    print("Sending POST to /cycle-counts/ ...")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Payload matching what frontend sends
    payload = {
        "count_date": "2025-01-18", # Example date
        "notes": "Repro Test",
        "location_scope": "All"
    }
    
    url = f"{base_url}/cycle-counts/"
    r = requests.post(url, json=payload, headers=headers)
    
    print(f"Status Code: {r.status_code}")
    print(f"Response Body: {r.text}")
    
    if r.status_code == 500:
        print("SUCCESS: Reproduced 500 Error.")
    else:
        print("DID NOT Reproduce 500 Error (Unexpected).")

if __name__ == "__main__":
    test_repro()
