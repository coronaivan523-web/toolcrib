from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime, timezone, timedelta

from fastapi import HTTPException

from app.core.supabase import supabase
from app.core.config import settings
from supabase import create_client
from app.schemas.requisition import (
    RequisitionCreate, RequisitionStatus, ApprovalAction, RequisitionPriority, 
    StepStatus, ApprovalStepName, RequisitionSubmit, RequisitionApprove, RequisitionReject,
    RequisitionUpdate
)

class RequisitionService:
    _cached_admin_client = None

    @classmethod
    def _get_admin_client(cls):
        # SECURITY HARDENING HC-1: Forced to use ANON client to enforce RLS.
        # No longer bypassing row level security for requisition operations.
        return supabase
    
    @staticmethod
    def create_draft(requester_id: UUID, data: RequisitionCreate, creator_id: UUID = None) -> Dict[str, Any]:
        import time
        t_start = time.time()
        print(f"[SVC] create_draft start for requester={requester_id}, creator={creator_id}")
        
        # Use admin client to bypass RLS for creation (API layer checks permissions)
        client = RequisitionService._get_admin_client()
        
        # 1. Insert Requisition (DRAFT)
        req_data = {
            "requester_id": str(requester_id),
            "created_by": str(creator_id) if creator_id else str(requester_id),
            "priority": data.priority,
            "justification": data.justification,
            "status": RequisitionStatus.DRAFT,
            # V2 Fields
            "purchase_justification": data.purchase_justification,
            "department": data.department,
            "job_title": data.job_title,
            "cause": data.cause,
            "criticality_requested": data.criticality_requested,
            "criticality_assigned": data.criticality_assigned,
            "requester_name": data.requester_name
        }
        
        try:
            res = client.table('requisitions').insert(req_data).execute()
        except Exception as e:
            sk_len = len(settings.SUPABASE_SERVICE_KEY) if settings.SUPABASE_SERVICE_KEY else 0
            client_type = "ADMIN" if client == cls._cached_admin_client and settings.SUPABASE_SERVICE_KEY else "ANON/FALLBACK"
            raise HTTPException(status_code=400, detail=f"DB Insert Failed: {e} | Client: {client_type} | SK_Len: {sk_len}")

        if not res.data:
            raise HTTPException(status_code=500, detail="Failed to create requisition - No data returned")
            
        requisition = res.data[0]
        req_id = requisition['id']
        
        # 2. Insert Items
        if data.items:
            items_data = []
            for item in data.items:
                items_data.append({
                    "requisition_id": req_id,
                    "material_id": item.material_id,
                    "quantity_requested": item.quantity_requested,
                    "unit": item.unit,
                    "notes": item.notes,
                    # V2 Fields
                    "supplier": item.supplier,
                    "cost_center": item.cost_center,
                    "project_code": item.project_code,
                    "monthly_consumption": item.monthly_consumption,
                    "monthly_consumption": item.monthly_consumption,
                    "cause": item.cause
                })
            
            # print(f"\\n[DEBUG] Inserting items data: {items_data}\\n")
            client.table('requisition_items').insert(items_data).execute()

        # 3. Insert Attachments (if any)
        if data.attachments:
            att_data = []
            for att in data.attachments:
                att_data.append({
                    "requisition_id": req_id,
                    "filename": att.filename,
                    "url": att.url,
                    "uploaded_by": str(requester_id)
                })
            client.table('requisition_attachments').insert(att_data).execute()
            
        return RequisitionService.get_requisition_by_id(req_id)

    @staticmethod
    def update_requisition(req_id: str, data: RequisitionUpdate, user_id: UUID) -> Dict[str, Any]:
        """ Update draft or rework requisition """
        client = RequisitionService._get_admin_client()
        
        # 1. Get Current & Verify Status
        current = RequisitionService.get_requisition_by_id(req_id)
        if current['status'] not in [RequisitionStatus.DRAFT, RequisitionStatus.REWORK_REQUIRED]:
            raise HTTPException(status_code=400, detail="Only DRAFT or REWORK_REQUIRED requisitions can be updated")
            
        # 2. Update Header
        update_data = {
            "priority": data.priority,
            "justification": data.justification,
            # V2 Fields
            "purchase_justification": data.purchase_justification,
            "department": data.department,
            "job_title": data.job_title,
            "cause": data.cause,
            "criticality_requested": data.criticality_requested,
            "criticality_assigned": data.criticality_assigned,
            "requester_name": data.requester_name,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        # Filter None values to avoid overwriting with null if that's desired (but Pydantic defaults usually implied).
        # However, for full update form, we expect all fields.
        
        client.table('requisitions').update(update_data).eq('id', req_id).execute()
        
        # 3. Update Items (Full Replace Strategy)
        if data.items is not None:
            # a) Delete existing items
            client.table('requisition_items').delete().eq('requisition_id', req_id).execute()
            
            # b) Insert new items
            if data.items:
                items_data = []
                for item in data.items:
                    items_data.append({
                        "requisition_id": req_id,
                        "material_id": item.material_id,
                        "quantity_requested": item.quantity_requested,
                        "unit": item.unit,
                        "notes": item.notes,
                        # V2 Fields
                        "supplier": item.supplier,
                        "cost_center": item.cost_center,
                        "project_code": item.project_code,
                        "monthly_consumption": item.monthly_consumption,
                        "cause": item.cause
                    })
                client.table('requisition_items').insert(items_data).execute()

        # 4. Attachments (Append Only)
        if data.attachments:
            att_data = []
            for att in data.attachments:
                att_data.append({
                    "requisition_id": req_id,
                    "filename": att.filename,
                    "url": att.url,
                    "uploaded_by": str(user_id)
                })
            client.table('requisition_attachments').insert(att_data).execute()
            
        return RequisitionService.get_requisition_by_id(req_id)
    @staticmethod
    def submit_requisition(req_id: str, submit_data: RequisitionSubmit, user_id: UUID) -> Dict[str, Any]:
        # Use admin client to bypass RLS for workflow management
        client = RequisitionService._get_admin_client()
        
        # 1. Get Current
        req = RequisitionService.get_requisition_by_id(req_id)
        if req['status'] not in ['DRAFT', 'REWORK_REQUIRED']:
             raise HTTPException(status_code=400, detail="Only DRAFT or REWORK_REQUIRED can be submitted")

        # 2. Generate Req Number (Atomic via Folio)
        # Strategy: Use existing SERIAL 'folio' combined with Year.
        # This is atomic because 'folio' is db-generated serial.
        req_number = req.get('req_number')
        if not req_number:
            year = datetime.now().year
            folio = req['folio']
            # Format: REQ-YYYY-#### (zero padded 4)
            req_number = f"REQ-{year}-{folio:04d}"
        
        # 3. Update Status & Assignments
        requests_data = {
            "status": 'UNDER_APPROVAL',
            "submitted_at": datetime.now(timezone.utc).isoformat(),
            "req_number": req_number,
        }
        # Only update legacy columns if provided (backward compatibility)
        if submit_data.gerente_mx_id:
             requests_data["gerente_mx_id"] = str(submit_data.gerente_mx_id)
        if submit_data.gerente_ch_id:
             requests_data["gerente_ch_id"] = str(submit_data.gerente_ch_id)
        if submit_data.gerente_gral_id:
             requests_data["gerente_gral_id"] = str(submit_data.gerente_gral_id)

        client.table('requisitions').update(requests_data).eq('id', req_id).execute()
        
        # 4. Create/Reset Workflow Steps
        # Use string literal for check to be safe
        if req['status'] == 'REWORK_REQUIRED': 
            # Resubmit Logic (Same as before, simplified)
            # a) Reset PENDING/REJECTED to WAITING or PENDING
             # We use string 'PENDING' and 'WAITING'
             client.table('requisition_approvals').update({'step_status': 'WAITING'}).eq('requisition_id', req_id).eq('step_status', 'PENDING').execute()
             
             approvals = req.get('approvals', [])
             rejected_step = None
             
             # Filter REJECTED steps
             rejected_steps = [s for s in approvals if s['step_status'] == 'REJECTED']
             
             if rejected_steps:
                 # Sort by action_at descending (latest first) to get the most recent rejection
                 # This ensures we resume from the *last* person who rejected, not a previous one
                 try:
                     rejected_steps.sort(key=lambda x: str(x.get('action_at') or ''), reverse=True)
                     rejected_step = rejected_steps[0]
                 except Exception as e:
                     print(f"[ERROR] Sorting rejected steps failed: {e}")
                     # Fallback to first
                     rejected_step = rejected_steps[0]
             
             # Debugging print
             print(f"[DEBUG] Resubmitting. Status: {req['status']}, Rejected Step: {rejected_step}")
             print(f"[DEBUG] All Approvals: {[(a['step_order'], a['step_status'], a.get('action_at')) for a in approvals]}")
             print(f"[DEBUG] Rejected Steps (Before Sort): {[(a['step_order'], a.get('action_at')) for a in rejected_steps]}")

             if rejected_steps:
                 # Sort by action_at descending (latest first)
                 try:
                     rejected_steps.sort(key=lambda x: str(x.get('action_at') or ''), reverse=True)
                     rejected_step = rejected_steps[0]
                     print(f"[DEBUG] Selected Rejected Step (After Sort): Step {rejected_step['step_order']} at {rejected_step.get('action_at')}")
                 except Exception as e:
                     print(f"[ERROR] Sorting rejected steps failed: {e}")
                     # Fallback to first
                     rejected_step = rejected_steps[0]

             if rejected_step:
                 # Reset future steps
                  client.table('requisition_approvals').update({'step_status': 'WAITING'})\
                      .eq('requisition_id', req_id)\
                      .gt('step_order', rejected_step['step_order'])\
                      .execute()

                  # Reset THIS step by creating a NEW one (Preserve History)
                  # We leave the REJECTED step as is.
                  new_step_data = {
                      "requisition_id": req_id,
                      "step_order": rejected_step['step_order'],
                      "step_name": rejected_step['step_name'],
                      "assigned_to_user_id": rejected_step['assigned_to_user_id'],
                      "step_status": 'PENDING',
                      "assigned_at": datetime.now(timezone.utc).isoformat(),
                      "comment": None # The new step should start clean, the comment is in the history step
                  }
                  
                  try:
                      client.table('requisition_approvals').insert(new_step_data).execute()
                  except Exception as e:
                      print(f"[ERROR] Failed to insert new step during resubmission: {e}")
                      client.table('requisitions').update({"status": 'REWORK_REQUIRED'}).eq('id', req_id).execute()
                      raise HTTPException(status_code=500, detail=f"Failed to create resubmission step: {e}")

                  # [HISTORY FIX] Insert a permanent record of the CORRECTION action
                  # This ensures the user's comment is preserved and visible in order
                  try:
                      history_correction_step = {
                          "requisition_id": req_id,
                          "step_order": rejected_step['step_order'], # Keep same order level
                          "step_name": "CORRECCIÓN", # Distinct name
                          "assigned_to_user_id": str(user_id),
                          "step_status": "APPROVED", # Marked as done/approved action
                          "assigned_at": (datetime.now(timezone.utc) - timedelta(seconds=1)).isoformat(),
                          "action_at": (datetime.now(timezone.utc) - timedelta(seconds=1)).isoformat(),
                          "action_by_user_id": str(user_id),
                          "comment": submit_data.resubmission_comment
                      }
                      # We insert it. Since step_order is same as Rejected/Pending, 
                      # sorting by action_at in frontend/backend will place it correctly in between.
                      client.table('requisition_approvals').insert(history_correction_step).execute()
                  except Exception as e:
                      print(f"[WARN] Failed to insert correction history step: {e}")
                      # Non-blocking error

                  
        else:
            # New Submission (From DRAFT) -> Create Steps
            
            # Step 1: Solicitante
            # Assign to the requester_id stored in the requisition, NOT necessarily the submitting user
            actual_requester_id = req.get('requester_id') or str(user_id)
            
            # Initial status for Step 1
            is_auto_approved = str(actual_requester_id) == str(user_id)
            
            steps_config = [
                {
                    "step_order": 1, 
                    "step_name": ApprovalStepName.SOLICITANTE, 
                    "assigned_to": str(actual_requester_id), 
                    # Auto-approve ONLY if the submitting user IS the actual requester
                    "status": StepStatus.APPROVED if is_auto_approved else StepStatus.PENDING,
                    "action_at": datetime.now(timezone.utc).isoformat() if is_auto_approved else None, 
                    "action_by": str(user_id) if is_auto_approved else None
                }
            ]

            if submit_data.custom_approvals:
                # Use custom dynamic list
                sorted_approvals = sorted(submit_data.custom_approvals, key=lambda x: x.order)
                
                # We start from order 2, because 1 is Solicitante
                current_step_order = 2
                
                for cust_step in sorted_approvals:
                    # Logic for sequential states:
                    # Step 2 is PENDING ONLY IF Step 1 was APPROVED.
                    # Otherwise, it stays WAITING.
                    
                    target_status = StepStatus.WAITING
                    if current_step_order == 2 and is_auto_approved:
                        target_status = StepStatus.PENDING

                    steps_config.append({
                        "step_order": current_step_order,
                        "step_name": cust_step.label,
                        "assigned_to": str(cust_step.user_id),
                        "status": target_status
                    })
                    current_step_order += 1
                    
            else:
                # Fallback to Old Fixed Logic (Legacy)
                # Step 2 is PENDING ONLY IF Step 1 was APPROVED
                status_step_2 = StepStatus.PENDING if is_auto_approved else StepStatus.WAITING
                
                steps_config.append({
                    "step_order": 2, "step_name": ApprovalStepName.GERENTE_MX, 
                    "assigned_to": str(submit_data.gerente_mx_id), "status": status_step_2
                })
                steps_config.append({
                    "step_order": 3, "step_name": ApprovalStepName.GERENTE_CH, 
                    "assigned_to": str(submit_data.gerente_ch_id), "status": StepStatus.WAITING
                })
                if submit_data.gerente_gral_id:
                     steps_config.append({
                        "step_order": 4, "step_name": ApprovalStepName.GERENTE_GENERAL, 
                        "assigned_to": str(submit_data.gerente_gral_id), "status": StepStatus.WAITING
                    })
            
            approvals_data = []
            for s in steps_config:
                row = {
                    "requisition_id": req_id,
                    "step_order": s['step_order'],
                    "step_name": s['step_name'],
                    "assigned_to_user_id": s['assigned_to'],
                    "step_status": s['status'],
                    "assigned_at": datetime.now(timezone.utc).isoformat() if s['status'] in [StepStatus.PENDING, StepStatus.APPROVED] else None,
                    "action_at": s.get('action_at'),
                    "action_by_user_id": s.get('action_by')
                }
                approvals_data.append(row)
                
            client.table('requisition_approvals').insert(approvals_data).execute()

        return RequisitionService.get_requisition_by_id(req_id)

    @staticmethod
    def approve_step(req_id: str, user_id: UUID, data: RequisitionApprove) -> Dict[str, Any]:
        # Use admin client to bypass RLS for workflow management
        client = RequisitionService._get_admin_client()

        # 1. Find Pending Step for User
        res = client.table('requisition_approvals').select('*')\
            .eq('requisition_id', req_id)\
            .eq('step_status', 'PENDING')\
            .eq('assigned_to_user_id', str(user_id))\
            .execute()
            
        if not res.data:
             raise HTTPException(status_code=403, detail="No pending approval found for this user")
        
        current_step = res.data[0]
        
        # 2. Update Current Step to APPROVED
        client.table('requisition_approvals').update({
            "step_status": 'APPROVED',
            "action_at": datetime.now(timezone.utc).isoformat(),
            "action_by_user_id": str(user_id),
            "comment": data.comment
        }).eq('id', current_step['id']).execute()
        
        # 3. Activate Next Step (Sequential)
        next_steps = client.table('requisition_approvals').select('*')\
            .eq('requisition_id', req_id)\
            .gt('step_order', current_step['step_order'])\
            .order('step_order')\
            .limit(1)\
            .execute()
            
        if next_steps.data:
            next_step = next_steps.data[0]
            # Set Next to PENDING
            client.table('requisition_approvals').update({
                "step_status": 'PENDING',
                "assigned_at": datetime.now(timezone.utc).isoformat()
            }).eq('id', next_step['id']).execute()
            
            # Req Status remains UNDER_APPROVAL
        else:
            # No next step -> Final Approval
            client.table('requisitions').update({
                "status": RequisitionStatus.APPROVED_PRE_PURCHASE
            }).eq('id', req_id).execute()
            
        return RequisitionService.get_requisition_by_id(req_id)

    @staticmethod
    def reject_step(req_id: str, user_id: UUID, data: RequisitionReject) -> Dict[str, Any]:
        # Use admin client
        client = RequisitionService._get_admin_client()

        # 1. Find Pending Step
        res = client.table('requisition_approvals').select('*')\
            .eq('requisition_id', req_id)\
            .eq('step_status', 'PENDING')\
            .eq('assigned_to_user_id', str(user_id))\
            .execute()
            
        if not res.data:
             raise HTTPException(status_code=403, detail="No pending approval found for this user")
        
        current_step = res.data[0]
        
        # 2. Update Step to REJECTED (Change Request)
        client.table('requisition_approvals').update({
            "step_status": 'REJECTED',
            "action_at": datetime.now(timezone.utc).isoformat(),
            "action_by_user_id": str(user_id),
            "comment": data.comment
        }).eq('id', current_step['id']).execute()
        
        # 3. Update Requisition Status to REWORK_REQUIRED
        client.table('requisitions').update({
            "status": 'REWORK_REQUIRED'
        }).eq('id', req_id).execute()
        
        return RequisitionService.get_requisition_by_id(req_id)

    @staticmethod
    def reject_final(req_id: str, user_id: UUID, data: RequisitionReject) -> Dict[str, Any]:
        """ Permanently reject the requisition (Final Rejection). """
        # Use admin client
        client = RequisitionService._get_admin_client()

        # 1. Find Pending Step (if any) - optional but good for audit
        res = client.table('requisition_approvals').select('*')\
            .eq('requisition_id', req_id)\
            .eq('step_status', 'PENDING')\
            .eq('assigned_to_user_id', str(user_id))\
            .execute()
            
        if res.data:
            current_step = res.data[0]
            # Update Step to REJECTED
            client.table('requisition_approvals').update({
                "step_status": 'REJECTED',
                "action_at": datetime.now(timezone.utc).isoformat(),
                "action_by_user_id": str(user_id),
                "comment": data.comment + " (FINAL REJECTION)"
            }).eq('id', current_step['id']).execute()
        
        # 2. Update Requisition Status to REJECTED_FINAL and Close it
        client.table('requisitions').update({
            "status": 'REJECTED_FINAL',
            "closed_at": datetime.now(timezone.utc).isoformat()
        }).eq('id', req_id).execute()
        
        return RequisitionService.get_requisition_by_id(req_id)
        
    @staticmethod
    def cancel_requisition(req_id: str, user_id: UUID) -> Dict[str, Any]:
        client = RequisitionService._get_admin_client()
        client.table('requisitions').update({
            "status": RequisitionStatus.CANCELED,
            "closed_at": datetime.now(timezone.utc).isoformat()
        }).eq('id', req_id).execute()
        
        return RequisitionService.get_requisition_by_id(req_id)

    @staticmethod
    def get_inbox(user_id: UUID) -> List[Dict[str, Any]]:
        client = RequisitionService._get_admin_client()
        print(f"\n[DEBUG] get_inbox for user_id: {user_id}")

        # 1. Get Pending Approvals assigned to user
        steps = client.table('requisition_approvals').select('requisition_id')\
            .eq('assigned_to_user_id', str(user_id))\
            .eq('step_status', 'PENDING')\
            .execute()
        
        step_ids = [s['requisition_id'] for s in steps.data] if steps.data else []

        # 2. Get Requisitions needing REWORK by this user (requester)
        reworks = client.table('requisitions').select('id')\
            .eq('status', 'REWORK_REQUIRED')\
            .eq('requester_id', str(user_id))\
            .execute()
        
        rework_ids = [r['id'] for r in reworks.data] if reworks.data else []
        
        # Combine unique IDs
        all_ids = list(set(step_ids + rework_ids))
        print(f"[DEBUG] Inbox IDs: {all_ids} (Steps: {len(step_ids)}, Reworks: {len(rework_ids)})")

        if not all_ids:
            return []
            
        # Added material:materials(*) to items join
        res = client.table('requisitions').select('*, items:requisition_items(*, material:materials(*)), requester:profiles!requester_id(*), creator:profiles!created_by(*), approvals:requisition_approvals(*, approver:profiles!assigned_to_user_id(*))').in_('id', all_ids).execute()
            
        return res.data

    @classmethod
    def get_user_role(cls, user_id: str) -> str:
        """ Fetch user role using Admin Client to bypass RLS and potential timeouts. """
        client = cls._get_admin_client()
        try:
            res = client.table('profiles').select('role').eq('id', user_id).single().execute()
            if res.data:
                return res.data.get('role', 'user')
        except Exception as e:
            print(f"[WARN] Failed to fetch role for {user_id}: {e}")
        return 'user'

    @classmethod
    def get_requisitions(cls, skip: int = 0, limit: int = 100, status: Optional[str] = None, requester_id: Optional[UUID] = None) -> List[Dict[str, Any]]:
        # Use admin client to ensure visibility if RLS is strict
        client = cls._get_admin_client()
        
        query = client.table('requisitions').select('*, items:requisition_items(*, material:materials(*)), requester:profiles!requester_id(*), creator:profiles!created_by(*), approvals:requisition_approvals(*, approver:profiles!assigned_to_user_id(*))').order('created_at', desc=True)
        if status:
            query = query.eq('status', status)

        if requester_id:
            # Modified to allow users to see requisitions they approved (History)
            # FORCE ADMIN CLIENT CHECK - client is already admin here
            
            # 1. Fetch IDs of requisitions where user was an approver
            try:
                ap_res = client.table('requisition_approvals').select('requisition_id').eq('assigned_to_user_id', str(requester_id)).execute()
                approved_ids = list(set([item['requisition_id'] for item in ap_res.data])) if ap_res.data else []
                
                if approved_ids:
                    # Construct OR filter: requester_id == user OR id IN approved_ids
                    # Syntax: "requester_id.eq.UID,id.in.(ID1,ID2)"
                    ids_str = ",".join(approved_ids)
                    or_cond = f"requester_id.eq.{requester_id},id.in.({ids_str})"
                    query = query.or_(or_cond)
                else:
                    query = query.eq('requester_id', str(requester_id))
            except Exception as e:
                print(f"[ERROR] Error fetching approval history: {e}")
                # Fallback to safe default
                query = query.eq('requester_id', str(requester_id))
        
        # Execute
        res = query.range(skip, skip + limit - 1).execute()
        return res.data

    @staticmethod
    def get_requisition_by_id(req_id: str) -> Dict[str, Any]:
        # Use admin client to ensure visibility
        client = RequisitionService._get_admin_client()
        
        res = client.table('requisitions').select('*, items:requisition_items(*, material:materials(*)), requester:profiles!requester_id(*), creator:profiles!created_by(*), approvals:requisition_approvals(*, approver:profiles!assigned_to_user_id(*))').eq('id', req_id).single().execute()
        if not res.data:
             raise HTTPException(status_code=404, detail="Requisition not found")
             
        if 'approvals' in res.data:
            res.data['approvals'].sort(key=lambda x: x['step_order'])
            
        return res.data

    @staticmethod
    def incoming_materials(req_id: str, items: List[Any], user_id: str) -> Dict[str, Any]:
        """
        Process incoming materials.
        items: List of objects with material_id, quantity, item_id
        """
        # Imports inside method to avoid circular deps
        from app.services.inventory_service import InventoryService
        from app.schemas.inventory import InventoryMovementCreate
        
        client = RequisitionService._get_admin_client()
        
        # 1. Get Requisition
        req = RequisitionService.get_requisition_by_id(req_id)
        
        # 2. Process Items
        # Re-fetch items to verify completion status later
        
        for item_data in items:
            # Update Requisition Item
            # We need to fetch current quantity_received to add, or just increment
            # Supabase doesn't support increment via update easily without function, so read-update
            
            # Fetch item
            r_item = client.table('requisition_items').select('*').eq('id', str(item_data.item_id)).single().execute()
            if not r_item.data:
                continue # Skip invalid
                
            current_rec = r_item.data.get('quantity_received', 0) or 0
            new_rec = current_rec + item_data.quantity
            
            # Prevent over-receiving? Optionally. For now assume user knows best.
            
            client.table('requisition_items').update({'quantity_received': new_rec}).eq('id', str(item_data.item_id)).execute()
            
            # Inventory Movement
            # Assuming material_id is correct
            inv_mov = InventoryMovementCreate(
                material_id=item_data.material_id,
                movement_type='IN',
                quantity=item_data.quantity,
                reference_type='REQUISITION',
                reference_id=req.get('folio'),
                notes=f"Incoming from Requisition {req.get('req_number')}"
            )
            InventoryService.create_movement(inv_mov, user_id)
            
        # 3. Check Overall Status
        # We need to check ALL items, not just the ones passed.
        # Re-fetch all items
        updated_req = RequisitionService.get_requisition_by_id(req_id)
        all_completed = True
        for item in updated_req['items']:
            q_req = item['quantity_requested']
            q_rec = item.get('quantity_received', 0) or 0
            if q_rec < q_req:
                all_completed = False
                break
        
        # If all items are fully received, update status
        # ALSO, if status was ORDERED or APPROVED, we can move to RECEIVED.
        # Note: If it's already CLOSED, we might leave it.
        if all_completed and req['status'] not in ['RECEIVED', 'CLOSED', 'CANCELLED']:
            client.table('requisitions').update({'status': 'RECEIVED'}).eq('id', req_id).execute()
        elif not all_completed and req['status'] in ['APPROVED_PRE_PURCHASE', 'ORDERED', 'PARTIALLY_RECEIVED']:
            # If not all completed, but we received SOMETHING (implied by this function being called),
            # Set to PARTIALLY_RECEIVED
            client.table('requisitions').update({'status': 'PARTIALLY_RECEIVED'}).eq('id', req_id).execute()
             
        return RequisitionService.get_requisition_by_id(req_id)
