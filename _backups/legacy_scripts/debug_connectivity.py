
import requests
import os
from dotenv import load_dotenv

# Load env from frontend to get the URL
load_dotenv(os.path.join(os.path.dirname(__file__), 'frontend', '.env'))

API_URL = os.environ.get("VITE_API_BASE_URL", "http://localhost:8001/api/v1")
print(f"Testing API URL: {API_URL}")

# We need a token. This is hard to get without login. 
# But we can try to hit the backend without token to see if we get 401 (which means it's UP) or Connection Error (which means it's DOWN).
try:
    print("Attempting connection to cycle-counts endpoint...")
    # Cycle counts requires auth, so we expect 401. 
    # If we get Connection Error, backend is down.
    res = requests.get(f"{API_URL}/cycle-counts/")
    print(f"Response Status: {res.status_code}")
    if res.status_code == 401:
        print("Backend is UP (Correctly returned 401 Unauthorized)")
    else:
        print(f"Backend returned unexpected status: {res.status_code}")
        print(res.text[:200])
except requests.exceptions.ConnectionError:
    print("CRITICAL: Connection Refused. Backend is likely DOWN or not accessible at this port.")
except Exception as e:
    print(f"An error occurred: {e}")
