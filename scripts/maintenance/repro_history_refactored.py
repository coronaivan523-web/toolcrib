
import asyncio
import os
import sys
from uuid import uuid4
import time

# Setup path to import app modules
sys.path.append(os.getcwd())

from app.services.requisition_service import RequisitionService
from app.schemas.requisition import RequisitionCreate, RequisitionItemCreate, RequisitionSubmit, RequisitionReject
from app.core.supabase import supabase

async def run_test():
    print("--- Starting History & Correction Logic Verification ---")

    # 1. Get Test Users
    users = supabase.table('profiles').select('id, email').limit(2).execute()
    if not users.data or len(users.data) < 1:
        print("No users found.")
        return

    requester = users.data[0]
    # Try to find a supervisor or just use same user
    approver = users.data[1] if len(users.data) > 1 else users.data[0]
    
    print(f"Requester: {requester['email']}")
    print(f"Approver: {approver['email']}")
    
    # 2. Create Draft
    print("\n[1] Creating Draft...")
    req_create = RequisitionCreate(
        priority='NORMAL',
        justification='History Test',
        items=[RequisitionItemCreate(material_id=1, quantity_requested=5)],
        requester_name="Test History User"
    )
    
    try:
        req = RequisitionService.create_draft(requester_id=requester['id'], data=req_create)
        print(f"Draft Created: {req['id']}")
    except Exception as e:
        print(f"Create Draft Failed: {e}")
        return

    # 3. Submit
    print("\n[2] Submitting...")
    submit_data = RequisitionSubmit(
        gerente_mx_id=approver['id'],
        gerente_ch_id=approver['id']
    )
    req = RequisitionService.submit_requisition(req['id'], submit_data, user_id=requester['id'])
    
    # 4. Reject (Simulate Manager)
    print("\n[3] Rejecting Step via Service...")
    approvals = req.get('approvals', [])
    pending = next((s for s in approvals if s['step_status'] == 'PENDING'), None)
    
    if not pending:
        # Maybe Step 1 was Solicitante (Auto-approved)? Get updated req
        req = RequisitionService.get_requisition_by_id(req['id'])
        approvals = req.get('approvals', [])
        pending = next((s for s in approvals if s['step_status'] == 'PENDING'), None)
        
    if not pending:
        print("No pending step found to reject.")
        return

    req = RequisitionService.reject_step(req['id'], pending['assigned_to_user_id'], RequisitionReject(comment="Fix quantity"))
    print(f"Rejected. Status: {req['status']}")

    # 5. Resubmit (Simulate Requester)
    print("\n[4] Resubmitting with Correction Note...")
    correction_note = "Fixed quantity to 10."
    resubmit_data = RequisitionSubmit(resubmission_comment=correction_note)
    
    req = RequisitionService.submit_requisition(req['id'], resubmit_data, user_id=requester['id'])
    
    # 6. Verify Logic
    print("\n[5] Verifying History Steps...")
    approvals = req.get('approvals', [])
    
    # Check for CORRECCIÓN step
    correction_step = next((s for s in approvals if s.get('step_name') == 'CORRECCIÓN'), None)
    
    if correction_step:
        print("[SUCCESS] Found 'CORRECCIÓN' step.")
        print(f" - Comment: {correction_step['comment']}")
        if correction_step['comment'] == correction_note:
            print("[PASS] Correction comment matches.")
        else:
            print("[FAIL] Comment mismatch.")
    else:
        print("[FAIL] 'CORRECCIÓN' step MISSING.")
        
    # Check for CLEAN Pending Step
    pending_step = next((s for s in approvals if s['step_status'] == 'PENDING'), None)
    if pending_step:
        print(f" - Pending Step Comment: {pending_step.get('comment')}")
        if pending_step.get('comment') is None:
             print("[PASS] Pending step comment is None (Clean).")
        else:
             print("[FAIL] Pending step HAS comment (Duplicate).")
    else:
        print("[WARN] No pending step found after resubmit??")

    for s in approvals:
        print(f"   > {s['step_name']} | {s['step_status']} | Comment: {s.get('comment')}")

if __name__ == "__main__":
    asyncio.run(run_test())
