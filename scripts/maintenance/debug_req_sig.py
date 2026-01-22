import os
import json
from supabase import create_client, Client
from datetime import datetime

# Load .env manually
try:
    with open(".env", "r") as f:
        for line in f:
            if "=" in line and not line.startswith("#"):
                key, val = line.strip().split("=", 1)
                os.environ[key] = val
except Exception as e:
    pass

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(url, key)

print("Fetching latest requisition...")
# Get specific req
res = supabase.table('requisitions')\
    .select('*, creator:profiles!created_by(*), approvals:requisition_approvals(*, approver:profiles!assigned_to_user_id(*))')\
    .eq('req_number', 'REQ-2026-0065')\
    .execute()

if not res.data:
    print("No requisitions found.")
else:
    req = res.data[0]
    print(f"Req ID: {req['id']}")
    print(f"Req Number: {req.get('req_number')}")
    print(f"Status: {req['status']}")
    print(f"Requester ID: {req['requester_id']}")
    print(f"Created By ID: {req.get('created_by')}")
    print(f"Creator Object: {req.get('creator')}")
    
    print("\n--- APPROVALS ---")
    for step in req.get('approvals', []):
        print(f"Step: {step['step_name']} (Order: {step['step_order']})")
        print(f"  Status: {step['step_status']}")
        print(f"  Assigned To: {step['assigned_to_user_id']}")
        print(f"  Action By: {step.get('action_by_user_id')}")
        approver = step.get('approver')
        if approver:
            has_sig = bool(approver.get('signature_url'))
            sig_url = approver.get('signature_url')
            print(f"  Approver Name: {approver.get('full_name')}")
            print(f"  Has Signature: {has_sig}")
            if has_sig:
                print(f"  Signature URL: {sig_url[:50]}...")
        else:
             print("  Approver Profile: Not found/loaded")
