import urllib.request
import urllib.error
import json

BASE_URL = "http://localhost:8001"

def check_endpoint(path):
    url = f"{BASE_URL}{path}"
    print(f"Checking {url}...")
    try:
        with urllib.request.urlopen(url) as response:
            print(f"Status: {response.status}")
            data = response.read().decode()
            print(f"Response: {data[:200]}...")
            return True
    except urllib.error.HTTPError as e:
        print(f"HTTPError: {e.code} - {e.reason}")
        print(f"Response: {e.read().decode()[:200]}...")
        return False
    except urllib.error.URLError as e:
        print(f"URLError: {e.reason}")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False

print("--- Backend Health Check ---")
if check_endpoint("/health/supabase"):
    print("Health check OK.")
else:
    print("Health check FAILED.")

print("\n--- Requisitions Check ---")
# This might return 401 Unauthorized if auth is required, which is expected/good status (server running)
check_endpoint("/api/v1/requisitions")
