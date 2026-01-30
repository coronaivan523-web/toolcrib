
import os
from supabase import create_client, Client

# Load .env manually
try:
    with open(".env", "r") as f:
        for line in f:
            if "=" in line and not line.startswith("#"):
                key, val = line.strip().split("=", 1)
                os.environ[key] = val
except Exception:
    pass

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(url, key)

print("Searching for a mixed case (Approver != Requester)...")

# 1. Get Approvals
res = supabase.table('requisition_approvals').select('*').eq('step_status', 'APPROVED').limit(50).execute()
approvals = res.data

for ap in approvals:
    user_id = ap['assigned_to_user_id']
    req_id = ap['requisition_id']
    
    # Get Requisition
    r_res = supabase.table('requisitions').select('requester_id, identifier:req_number').eq('id', req_id).single().execute()
    if r_res.data:
        req = r_res.data
        if req['requester_id'] != user_id:
            print(f"Found Case!")
            print(f"User ID: {user_id}")
            print(f"Requisition: {req['identifier']} (ID: {req_id})")
            print(f"Requester: {req['requester_id']}")
            print(f"Approver: {user_id}")
            print("-" * 20)
            
            # Now Check if get_requisitions returns this for the user
            # We need to import the service, but since we are inconsistent with imports, 
            # let's just simulate the query logic used in the service.
            
            print("Simulating Service Query Logic...")
            
            # Logic from service:
            # 1. Fetch IDs where user is approver
            ap_res = supabase.table('requisition_approvals').select('requisition_id').eq('assigned_to_user_id', user_id).execute()
            approved_ids = list(set([item['requisition_id'] for item in ap_res.data]))
            print(f"User has approved {len(approved_ids)} requisitions.")
            
            if req_id in approved_ids:
                print(" > Confirmation: The target requisition IS in the approved list.")
            else:
                print(" > ERROR: The target requisition IS NOT in the approved list (Data consistency issue?)")
                
            # 2. Build Query
            ids_str = ",".join(approved_ids)
            # or_cond = f"requester_id.eq.{user_id},id.in.({ids_str})"
            # print(f"OR Condition: {or_cond}")
            
            # Try to run the actual OR query against supabase
            try:
                # Note: supabase-py doesn't expose .or_ directly cleanly on the builder sometimes without raw string
                # usage: .or_("filter")
                
                # Replicating: query.or_(or_cond)
                or_cond = f"requester_id.eq.{user_id},id.in.({ids_str})"
                print(f"Querying with OR filter...")
                
                final_res = supabase.table('requisitions').select('id, req_number').or_(or_cond).execute()
                
                found = False
                for item in final_res.data:
                    if item['id'] == req_id:
                        found = True
                        break
                
                if found:
                    print("SUCCESS: The service logic SHOULD return this requisition.")
                else:
                    print("FAILURE: The service logic DID NOT return this requisition.")
                    
            except Exception as e:
                print(f"Query Failed: {e}")
            
            break
