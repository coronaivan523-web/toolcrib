import requests
import json

BASE_URL = "http://localhost:8001/api/v1"

def test_materials_endpoint():
    url = f"{BASE_URL}/materials/"
    print(f"Testing GET {url} ...")
    try:
        # Note: This endpoint might require auth if not unprotected. 
        # But for 404 check, even a 401 Unauthorized means the route EXISTS.
        # A 404 means it does not exist.
        resp = requests.get(url)
        print(f"Status Code: {resp.status_code}")
        
        if resp.status_code == 200:
            print("Success! Endpoint is working.")
            try:
                data = resp.json()
                print(f"Returned {len(data)} materials.")
            except:
                print("Could not parse JSON.")
        elif resp.status_code == 401:
            print("Success! Endpoint exists (Auth required). 404 is fixed.")
        elif resp.status_code == 404:
            print("FAILURE: Endpoint still returns 404 Not Found.")
        else:
            print(f"Unexpected status: {resp.status_code}")
            print(resp.text)
            
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    test_materials_endpoint()
