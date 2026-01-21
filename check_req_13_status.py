import asyncio
from app.core.supabase import supabase_admin
from app.core.config import settings
from supabase import create_client

async def main():
    print(f"Checking REQ-2026-0013...")
    
    # Init client
    url = settings.SUPABASE_URL
    key = settings.SUPABASE_SERVICE_KEY
    if not key:
        print("No service key found!")
        return
        
    client = create_client(url, key)
    
    res = client.table('requisitions').select('id, req_number, status').eq('req_number', 'REQ-2026-0013').execute()
    
    if res.data:
        r = res.data[0]
        print(f"FOUND: {r['req_number']} | Status: {r['status']} | ID: {r['id']}")
        
        # Check approvals
        ap_res = client.table('requisition_approvals').select('step_name, step_status, assigned_to_user_id').eq('requisition_id', r['id']).execute()
        print("Approvals:")
        for ap in ap_res.data:
            print(f" - {ap['step_name']}: {ap['step_status']}")
    else:
        print("REQ-2026-0013 NOT FOUND")

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
