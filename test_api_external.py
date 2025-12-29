import requests
import json

URL = "http://localhost:8001/api/v1/users/"

try:
    print(f"Requesting {URL}...")
    # Add a dummy token if auth is needed, or no token if we want to test anon access (though endpoint usually expects a token for get_current_user)
    # The endpoint has `current_user = Depends(get_current_user)`.
    # So we MUST provide a valid token, or it sends 401.
    
    # Wait, I don't have a valid user token easily handy unless I login.
    # But I can check if it returns 401 or something else.
    # If it returns 401, that confirms the server is running.
    
    # Actually, let's try to simulate a login first if possible, or just check health check.
    
    response = requests.get(URL)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    
except Exception as e:
    print(f"Request failed: {e}")
