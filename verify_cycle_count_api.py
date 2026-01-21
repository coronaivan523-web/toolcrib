import requests

BASE_URL = "http://localhost:8001/api/v1"

def test_endpoint():
    try:
        print(f"Testing {BASE_URL}/cycle-counts/ ...")
        resp = requests.get(f"{BASE_URL}/cycle-counts/")
        print(f"Status Code: {resp.status_code}")
        if resp.status_code == 401:
            print("Success! Endpoint exists and is protected.")
        elif resp.status_code == 200:
            print("Success! Endpoint exists and returned data.")
        elif resp.status_code == 404:
            print("FAILURE: Endpoint not found (404).")
            # Maybe backend hasn't reloaded yet?
        else:
            print(f"Unexpected status: {resp.status_code}")
            print(resp.text)
            
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    test_endpoint()
