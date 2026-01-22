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

supabase = create_client(url, key)

print("Checking Folio 12...")
res = supabase.table("requisitions").select("*").eq("folio", 12).execute()
if res.data:
    r = res.data[0]
    print(f"Found ID: {r['id']}")
    print(f"Requester ID: {r['requester_id']}")
    print(f"Requester Name (in JSON): {r.get('requester_name')}")
    
    # Check Profile
    p_res = supabase.table("profiles").select("*").eq("id", r['requester_id']).execute()
    if p_res.data:
        print(f"Profile Name: {p_res.data[0]['full_name']}")
    else:
        print("Profile NOT FOUND")
else:
    print("Requisition Folio 12 NOT FOUND")
