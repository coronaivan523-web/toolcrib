import requests
import json
import sys
import os

# Append path to import config if needed
sys.path.append(os.getcwd())
from app.core.config import settings

from app.core.supabase import supabase_admin
from uuid import uuid4

def test_api():
    print("Preparing API Test (Attempt 2)...")
    base_url = "http://localhost:8001/api/v1"
    
    # 1. Create Temp User
    email = f"test_api_{uuid4()}@example.com"
    password = "testpassword123"
    print(f"Creating temp user: {email}")
    
    # Check if user exists? No, UUID is random.
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
    
    # 2. Login to get Token
    print("Logging in...")
    login_url = f"{base_url}/auth/login" # CORRECTED URL
    
    # Payload for OAuth2PasswordRequestForm is form-encoded, not JSON
    resp = requests.post(login_url, data={"username": email, "password": password})
    
    if resp.status_code != 200:
        print(f"Login failed: {resp.status_code} {resp.text}")
        return
        
    token = resp.json()['access_token']
    print(f"Got Token.")
    
    # 3. Create Draft
    print("Creating Draft via API...")
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "priority": "NORMAL",
        "justification": "API Test Cause",
        "department": "IT",
        "job_title": "Tester",
        "cause": "OP", # HEADER CAUSE
        "criticality_requested": "C1",
        "requester_name": "API Tester",
        "items": [
            {
                "material_id": 1, 
                "quantity_requested": 1,
                "unit": "EA",
                "notes": "API Test Item",
                "cause": "LS" # ITEM CAUSE
            }
        ]
    }
    
    create_url = f"{base_url}/requisitions"
    r = requests.post(create_url, json=payload, headers=headers)
    
    if r.status_code != 200:
        print(f"Create Draft Failed: {r.status_code} {r.text}")
        return
        
    req_data = r.json()
    req_id = req_data['id']
    print(f"Draft Created: {req_id}")
    
    # 4. Verification from Response
    print(f"Response Header Cause: {req_data.get('cause')}")
    item = req_data['items'][0]
    print(f"Response Item Cause: {item.get('cause')}")
    
    # 5. Double Check DB
    print("Checking DB directly...")
    db_req = supabase_admin.table('requisition_items').select('cause').eq('id', item['id']).single().execute()
    print(f"DB Item Cause: {db_req.data.get('cause')}")

if __name__ == "__main__":
    test_api()
