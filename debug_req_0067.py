
import asyncio
import os
from supabase import create_client, Client


# Load .env manually
try:
    with open(".env", "r") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ[k] = v
except Exception as e:
    print(f"Warning: Could not read .env: {e}")

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://your-project.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")


if not SUPABASE_KEY:
    print("Error: SUPABASE_SERVICE_KEY not set")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

async def main():
    print("--- Debugging REQ-2026-0067 ---")
    
    # 1. Get Requisition
    res = supabase.table('requisitions').select('*').eq('req_number', 'REQ-2026-0067').execute()
    if not res.data:
        print("Requisition NOT FOUND")
        return
    
    req = res.data[0]
    print(f"ID: {req['id']}")
    print(f"Requester ID: {req.get('requester_id')}")
    print(f"Created By: {req.get('created_by')}")
    print(f"Status: {req.get('status')}")
    
    # 2. Get Requester Profile
    if req.get('requester_id'):
        u_res = supabase.table('profiles').select('email, full_name').eq('id', req['requester_id']).execute()
        print(f"Requester Profile: {u_res.data}")

    # 3. Get Creator Profile
    if req.get('created_by'):
        c_res = supabase.table('profiles').select('email, full_name').eq('id', req['created_by']).execute()
        print(f"Creator Profile: {c_res.data}")

    # 4. Get Approvals
    print("\n--- Approvals ---")
    stats = supabase.table('requisition_approvals').select('*').eq('requisition_id', req['id']).order('step_order').execute()
    for step in stats.data:
        assignee_res = supabase.table('profiles').select('email, full_name, signature_url').eq('id', step['assigned_to_user_id']).execute()
        assignee = assignee_res.data[0] if assignee_res.data else "Unknown"
        
        action_by = "None"
        if step.get('action_by_user_id'):
             ab_res = supabase.table('profiles').select('email, full_name, signature_url').eq('id', step['action_by_user_id']).execute()
             action_by = ab_res.data[0] if ab_res.data else "Unknown"

        print(f"Step {step['step_order']}: {step['step_name']}")
        print(f"  Status: {step['step_status']}")
        print(f"  Assigned To: {assignee}")
        print(f"  Action By: {action_by}")
        print(f"  Action At: {step.get('action_at')}")
        print("-" * 20)

if __name__ == "__main__":
    asyncio.run(main())
