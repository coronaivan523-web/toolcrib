
import urllib.request
import urllib.parse
import json
import sys
import time

URL = "http://localhost:8000/api/v1/auth/login"
USERNAME = "admin"
PASSWORD = "admin123"

def test_login():
    print(f"Testing login at {URL} with {USERNAME}/*****")
    data = urllib.parse.urlencode({
        'username': USERNAME,
        'password': PASSWORD
    }).encode('utf-8')

    req = urllib.request.Request(URL, data=data, method='POST')
    # OAuth2 specifies form-data, but urllib defaults to application/x-www-form-urlencoded which is compatible with OAuth2 password flow usually.
    
    try:
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                body = response.read().decode('utf-8')
                json_body = json.loads(body)
                print("SUCCESS: Login successful.")
                print(f"Token: {json_body.get('access_token')[:20]}...")
                return True
            else:
                print(f"FAILURE: Status {response.status}")
                return False
    except urllib.error.URLError as e:
        print(f"FAILURE: Connection error: {e}")
        return False

if __name__ == "__main__":
    # Wait a bit for server to start if run immediately
    print("Waiting 2s for server readiness...")
    time.sleep(2)
    if test_login():
        sys.exit(0)
    else:
        sys.exit(1)
