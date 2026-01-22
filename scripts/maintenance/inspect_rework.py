import asyncio
from app.services.requisition_service import RequisitionService
from app.core.config import settings
import json

async def main():
    print("Searching for REWORK_REQUIRED requisitions...")
    # Manually init supabase if needed or rely on service
    
    try:
        # Get latest 10 requisitions to find one in REWORK
        reqs = RequisitionService.get_requisitions(limit=50)
        rework_req = None
        for r in reqs:
            if r['status'] == 'REWORK_REQUIRED':
                rework_req = r
                break
        
        if not rework_req:
            print("No REWORK_REQUIRED requisition found in last 50.")
            # Try finding ANY with rejection history
            for r in reqs:
                if any(start['step_status'] == 'REJECTED' for start in r.get('approvals', [])):
                    rework_req = r
                    print(f"Found requisition with rejection history (Status: {r['status']})")
                    break
        
        if rework_req:
            print(f"Inspecting Req: {rework_req.get('req_number')} (ID: {rework_req['id']})")
            approvals = rework_req.get('approvals', [])
            print(f"Total Approvals: {len(approvals)}")
            
            print("-" * 60)
            print(f"{'Order':<5} | {'Status':<10} | {'Action At':<30} | {'ID'}")
            print("-" * 60)
            for ap in approvals:
                print(f"{ap['step_order']:<5} | {ap['step_status']:<10} | {ap.get('action_at', 'None'):<30} | {ap['id']}")
            print("-" * 60)
            
            # Simulate logic
            rejected_steps = [s for s in approvals if s['step_status'] == 'REJECTED']
            print(f"\nRejected Steps Count: {len(rejected_steps)}")
            
            if rejected_steps:
                rejected_steps.sort(key=lambda x: str(x.get('action_at') or ''), reverse=True)
                top = rejected_steps[0]
                print(f"Logic would pick: Order {top['step_order']} at {top.get('action_at')}")
                
        else:
            print("No suitable requisition found to inspect.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
