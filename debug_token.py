
import requests
from app.core.config import settings
import json

BASE_URL = "http://localhost:8001/api/v1"

def login():
    from supabase import create_client
    url = settings.SUPABASE_URL
    key = settings.SUPABASE_SERVICE_KEY # Service Key
    admin = create_client(url, key)
    
    import uuid
    email = f"debug_auto_{uuid.uuid4()}@test.com"
    password = "password123"
    
    print(f"Creating user {email} via Admin...")
    user = admin.auth.admin.create_user({
        "email": email,
        "password": password,
        "email_confirm": True,
        "user_metadata": {"role": "admin", "full_name": "Debug Admin"}
    })
    
    # Now login as that user (public client)
    public = create_client(url, settings.SUPABASE_KEY)
    res = public.auth.sign_in_with_password({"email": email, "password": password})
    return res.session.access_token

def test_api():
    token = login()
    if not token:
        return

    print(f"Got Token: {token[:10]}...")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    body = {
        "priority": "NORMAL",
        "justification": "Debug Time Skew",
        "department": "IT",
        "job_title": "Tester",
        "requester_name": "Debug User",
        "criticality_requested": "C1",
        "items": []
    }
    
    print("Sending POST /requisitions...")
    r = requests.post(f"{BASE_URL}/requisitions/", headers=headers, json=body)
    
    print(f"Status Code: {r.status_code}")
    print(f"Response Body: {r.text}")

if __name__ == "__main__":
    test_api()
