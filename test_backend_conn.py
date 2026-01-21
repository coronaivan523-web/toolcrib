
import requests
import json
import os
from datetime import date

# Use the port established in previous steps (8002)
BASE_URL = "http://localhost:8002/api/v1"

# We need a token. Let's try to login as admin first to get one.
# If login is tricky, we might need to mock or inspect env vars.
# Assuming standard credentials or we can skip auth if dev mode allows (it doesn't).
# Let's try to login with known credentials or ask user. 
# BUT, we have access to the DB? 
# Better: We can try to hit the endpoint. If it returns 401, we know it's reachable.
# If it hangs, we know it's dead.

def test_connection():
    try:
        print(f"Testing connection to {BASE_URL}...")
        
        # 1. Test List (GET)
        print("\n--- TEST 1: GET /cycle-counts ---")
        resp = requests.get(f"{BASE_URL}/cycle-counts/", timeout=10)
        print(f"Status: {resp.status_code}")
        if resp.status_code == 200:
            print("Success! Data:", resp.json()[:1] if resp.json() else "[]")
        else:
            print("Failed! Response:", resp.text)

        # 2. Test Create (POST)
        print("\n--- TEST 2: POST /cycle-counts ---")
        # We need a valid UUID for a user? 
        # Since I can't easily auth, I will rely on the endpoint...
        # WAIT. The endpoint requires Auth.
        # My previous test returned 401.
        # This confirms the server is UP.
        # But to test the LOGIC (DB Crash), I need to bypass auth or have a token.
        # I cannot easily get a token here without credentials.
        
        # HOWEVER, the SERVER LOGS showed the request reaching the service layer in previous attempts (lines 114+).
        # This means the User IS authenticated in the browser.
        # The crash happens INSIDE the service.
        
        # Use the "admin" secret if available?
        # NO, endpoint uses `get_current_user`.
        
        print("Skipping POST auth check from script (requires token). Assuming Browser has token.")
        
    except requests.exceptions.Timeout:
        print("TIMEOUT: Server is not responding within 5 seconds.")
    except requests.exceptions.ConnectionError:
        print("CONNECTION ERROR: Server might be down or port is wrong.")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    test_connection()
