
import urllib.request
import urllib.parse
import json
import sys
import time

URL = "http://localhost:8001/api/v1/auth/login"
USERNAME = "admin"
PASSWORD = "admin"

def test_login():
    print(f"Testing login at {URL} with {USERNAME}/*****")
    data = urllib.parse.urlencode({
        'username': USERNAME,
        'password': PASSWORD
    }).encode('utf-8')

    req = urllib.request.Request(URL, data=data, method='POST')
    
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
        # Try to read error body if possible
        try:
             if hasattr(e, 'read'):
                print(e.read().decode('utf-8'))
        except:
            pass
        return False

if __name__ == "__main__":
    if test_login():
        sys.exit(0)
    else:
        sys.exit(1)
