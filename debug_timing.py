
import requests
import time
import json
import uuid
from app.core.config import settings
from supabase import create_client

BASE_URL = "http://localhost:8001/api/v1"

def login():
    url = settings.SUPABASE_URL
    key = settings.SUPABASE_SERVICE_KEY # Service Key
    admin = create_client(url, key)
    
    email = f"debug_timing_{uuid.uuid4()}@test.com"
    password = "password123"
    
    print(f"Creating user {email} via Admin...")
    try:
        user = admin.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {"role": "admin", "full_name": "Debug Timing User"}
        })
        # Force update role in profiles table to be sure
        if user.user:
            admin.table('profiles').update({'role': 'admin'}).eq('id', user.user.id).execute()
    except Exception as e:
        print(f"Create User Failed: {e}")
        return None
    
    # Now login as that user (public client)
    public = create_client(url, settings.SUPABASE_KEY)
    res = public.auth.sign_in_with_password({"email": email, "password": password})
    return res.session.access_token

def test_timing():
    token = login()
    if not token:
        print("Could not get token. Aborting.")
        return

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "priority": "NORMAL",
        "justification": "Timing Test",
        "department": "IT",
        "job_title": "Tester",
        "requester_name": "Timing Bot",
        "criticality_requested": "C1",
        "items": []
    }
    
    print("\n--- Request 1 (Expect Cold/Slow) ---")
    start = time.time()
    res = requests.post(f"{BASE_URL}/requisitions/", json=payload, headers=headers)
    end = time.time()
    print(f"Status: {res.status_code}")
    print(f"Time: {end - start:.4f}s")
    print(f"Response: {res.text[:100]}...")
    
    print("\n--- Request 2 (Expect Warm/Fast) ---")
    start = time.time()
    res = requests.post(f"{BASE_URL}/requisitions/", json=payload, headers=headers)
    end = time.time()
    print(f"Status: {res.status_code}")
    print(f"Time: {end - start:.4f}s")
    print(f"Response: {res.text[:100]}...")

if __name__ == "__main__":
    test_timing()
