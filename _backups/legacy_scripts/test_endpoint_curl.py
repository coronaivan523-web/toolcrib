
import requests

URL = "http://localhost:8001/api/v1/requisitions/00000000-0000-0000-0000-000000000000/reject-final"
print(f"Testing POST to {URL}...")
try:
    resp = requests.post(URL, json={"comment": "test"})
    print(f"Status Code: {resp.status_code}")
    print(f"Response: {resp.text}")
except Exception as e:
    print(f"Connection Failed: {e}")
