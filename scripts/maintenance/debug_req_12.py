import os
from supabase import create_client, Client

# Load .env manually
try:
    with open(".env", "r") as f:
        for line in f:
            if "=" in line and not line.startswith("#"):
                key, val = line.strip().split("=", 1)
                os.environ[key] = val
except Exception as e:
    print(f"Warning: Could not read .env: {e}")

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY")

if not url or not key:
    print("Error: Missing env vars.")
    exit(1)

supabase: Client = create_client(url, key)

print("\n--- INSPECTING REQUISITION FOLIO 12 ---")
try:
    response = supabase.table("requisitions")\
        .select("id, folio, req_number, requester_id, requester:profiles!requester_id(*)")\
        .eq("folio", 12)\
        .execute()
    
    if response.data:
        req = response.data[0]
        print(f"ID: {req['id']}")
        print(f"Folio: {req['folio']}")
        print(f"Req Number: {req['req_number']}")
        print(f"Requester ID: {req['requester_id']}")
        print(f"Requester Profile: {req['requester']}")
        
        # Check Item for this requisition and material 2
        print("\n--- CHECKING ITEM FOR REQUISITION ---")
        item_res = supabase.table("requisition_items")\
            .select("*")\
            .eq("requisition_id", req['id'])\
            .eq("material_id", 2)\
            .execute()
        print(item_res.data)

    else:
        print("Requisition with folio 12 not found.")

except Exception as e:
    print(f"Error: {e}")
