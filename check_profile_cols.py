import os
from supabase import create_client

# Load .env
try:
    with open(".env", "r") as f:
        for line in f:
            if "=" in line and not line.startswith("#"):
                key, val = line.strip().split("=", 1)
                os.environ[key] = val
except:
    pass

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY")

if not url or not key:
    print("Error: Credenciales no encontradas.")
    exit(1)

supabase = create_client(url, key)

print("Checking one profile to see keys...")
res = supabase.table("profiles").select("*").limit(1).execute()
if res.data:
    print("Keys found in profile:", res.data[0].keys())
else:
    print("No profiles found.")
