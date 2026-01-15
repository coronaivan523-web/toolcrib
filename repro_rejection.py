
import asyncio
import os
import sys
from uuid import uuid4

# Setup path to import app modules
sys.path.append(os.getcwd())

# Mock environment if needed or ensure .env is loaded
# (Assuming the environment is already set up or .env exists in CWD)

from app.services.requisition_service import RequisitionService
from app.schemas.requisition import RequisitionCreate, RequisitionItemCreate, RequisitionSubmit, RequisitionReject
from app.core.supabase import supabase

async def run_test():
    print("--- Starting Rejection Workflow Reproduction ---")

    # 1. Get a test user (e.g. Ivan if exists, or just the first user)
    # We need a user who is NOT the requester to test approval/rejection properly, or use same user for simple test
    
    users = supabase.table('profiles').select('id, email').limit(2).execute()
    if not users.data:
        print("No users found to test with.")
        return

    requester = users.data[0]
    approver = users.data[0] # Use same user for simplicity first, or distinct if needed
    
    print(f"Requester: {requester['email']} ({requester['id']})")
    
    # 2. Create Draft
    print("\n[1] Creating Draft Requisition...")
    req_create = RequisitionCreate(
        priority='NORMAL',
        justification='Test Rejection Workflow',
        items=[
            RequisitionItemCreate(
                material_id=1, # Assume material 1 exists
                quantity_requested=5
            )
        ],
        requester_name="Test User"
    )
    
    try:
        # We need to simulate the 'creator_id' context. Service uses admin client so we pass IDs.
        req = RequisitionService.create_draft(requester_id=requester['id'], data=req_create)
        print(f"Draft Created: {req['id']} - Status: {req['status']}")
    except Exception as e:
        print(f"Failed to create draft: {e}")
        return

    # 3. Submit
    print("\n[2] Submitting Requisition...")
    submit_data = RequisitionSubmit(
        gerente_mx_id=approver['id'], # Self-approve for testing logic
        gerente_ch_id=approver['id']
    )
    
    try:
        req = RequisitionService.submit_requisition(req['id'], submit_data, user_id=requester['id'])
        print(f"Submitted. Status: {req['status']}")
    except Exception as e:
        print(f"Failed to submit: {e}")
        return
        
    # Check approvals
    approvals = req.get('approvals', [])
    print(f"Approvals generated: {len(approvals)}")
    for a in approvals:
        print(f" - Step {a['step_order']}: {a['step_name']} ({a['step_status']}) Assigned: {a['assigned_to_user_id']}")

    # 4. Find the first PENDING step to Reject
    pending_step = next((s for s in approvals if s['step_status'] == 'PENDING'), None)
    
    if not pending_step:
        print("No pending step found. Maybe auto-approved?")
        # If auto-approved (Solicitante), fetch again to see if next step is pending
        req = RequisitionService.get_requisition_by_id(req['id'])
        approvals = req.get('approvals', [])
        pending_step = next((s for s in approvals if s['step_status'] == 'PENDING'), None)
    
    if not pending_step:
        print("Still no pending step. Workflow might be finished.")
        return

    print(f"\n[3] Rejecting Step {pending_step['step_order']} ({pending_step['step_name']})...")
    reject_data = RequisitionReject(comment="Testing Rejection Logic")
    
    try:
        # Rejecting as the assigned user
        req_after_reject = RequisitionService.reject_step(req['id'], pending_step['assigned_to_user_id'], reject_data)
        
        print("\n--- RESULT ---")
        print(f"ID: {req_after_reject['id']}")
        print(f"Final Status: {req_after_reject['status']}")
        
        rejected_step = next((s for s in req_after_reject['approvals'] if s['step_order'] == pending_step['step_order']), None)
        print(f"Step Status: {rejected_step['step_status']}")
        
        if req_after_reject['status'] == 'REWORK_REQUIRED':
             print("SUCCESS: Status updated to REWORK_REQUIRED")
        else:
             print(f"FAILURE: Status is {req_after_reject['status']}, expected REWORK_REQUIRED")

    except Exception as e:
        print(f"Detailed Error during rejection: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(run_test())
