
import os
import json
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

def debug_user_visibility(email_substring="enrique.mora"):
    print(f"Finding user matching '{email_substring}'...")
    
    # 1. Find User
    profiles = supabase.table('profiles').select('*').ilike('email', f'%{email_substring}%').execute()
    if not profiles.data:
        print("No user found.")
        return
        
    user = profiles.data[0]
    user_id = user['id']
    print(f"User Found: {user['full_name']} ({user['email']})")
    print(f"ID: {user_id}")
    print(f"Role: {user.get('role')}")
    
    # 2. Check Approvals
    print("\n--- Checking Approvals ---")
    ap_res = supabase.table('requisition_approvals').select('requisition_id, step_name, step_status').eq('assigned_to_user_id', user_id).execute()
    
    if not ap_res.data:
        print("User has NO assignments in approvals table.")
        return

    print(f"Found {len(ap_res.data)} approval assignments.")
    approved_ids = list(set([item['requisition_id'] for item in ap_res.data]))
    print(f"Unique Requisition IDs: {len(approved_ids)}")
    # print(approved_ids)
    
    # 3. Simulate Query
    print("\n--- Simulating Service Query ---")
    
    # Construct OR filter
    if approved_ids:
        # Quote UUIDs just in case? No, postgrest usually takes raw.
        ids_str = ",".join(approved_ids)
        
        # Test 1: Raw UUIDs
        or_cond = f"requester_id.eq.{user_id},id.in.({ids_str})"
        print(f"Query Filter (Raw): {or_cond}")
        
        try:
            res = supabase.table('requisitions').select('id, req_number, requester_id').or_(or_cond).execute()
            print(f"Results Count: {len(res.data)}")
            for r in res.data[:5]:
                is_own = r['requester_id'] == user_id
                print(f" - {r['req_number']} (Own: {is_own})")
        except Exception as e:
            print(f"[ERROR] Raw Query Failed: {e}")
            
        # Test 2: Quoted UUIDs (if needed)
        # quoted_ids = [f'"{x}"' for x in approved_ids]
        # ids_str_q = ",".join(quoted_ids)
        # or_cond_q = f"requester_id.eq.{user_id},id.in.({ids_str_q})"
        # print(f"\nQuery Filter (Quoted): {or_cond_q}")
        # try:
        #     res = supabase.table('requisitions').select('id, req_number').or_(or_cond_q).execute()
        #     print(f"Results Count (Quoted): {len(res.data)}")
        # except Exception as e:
        #     print(f"[ERROR] Quoted Query Failed: {e}")

    else:
        print("No approved IDs, would query only requester_id.")

debug_user_visibility()
