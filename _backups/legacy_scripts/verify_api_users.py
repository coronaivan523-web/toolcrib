import requests
baseUrl = "http://localhost:8001"

def check(path, expect_status=200):
    url = f"{baseUrl}{path}"
    print(f"Checking {url}")
    try:
        res = requests.get(url)
        print(f"Status: {res.status_code}")
        print(f"Body: {res.text[:200]}")
    except Exception as e:
        print(f"Error: {e}")

check("/health/db")
check("/api/v1/users/debug/check")
check("/api/v1/users/debug/users", expect_status=200)
check("/api/v1/users/all")
