from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime

from fastapi import HTTPException

from app.core.supabase import supabase, supabase_admin
from app.core.config import settings
from supabase import create_client
from app.schemas.requisition import (
    RequisitionCreate, RequisitionStatus, ApprovalAction, RequisitionPriority, 
    StepStatus, ApprovalStepName, RequisitionSubmit, RequisitionApprove, RequisitionReject
)

class RequisitionService:
    _cached_admin_client = None

    @classmethod
    def _get_admin_client(cls):
        if cls._cached_admin_client:
            return cls._cached_admin_client

        # Prefer global admin client, fallback to manual creation, fallback to anon
        if supabase_admin:
            cls._cached_admin_client = supabase_admin
            return supabase_admin
            
        if settings.SUPABASE_SERVICE_KEY:
            print("[INFO] Creating new Supabase Admin Client (Cached)")
            cls._cached_admin_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
            return cls._cached_admin_client
            
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
            "submitted_at": datetime.now().isoformat(),
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
             for step in approvals:
                  if step['step_status'] == 'REJECTED':
                      rejected_step = step
                      break
             
             # Debugging print
             print(f"[DEBUG] Resubmitting. Status: {req['status']}, Rejected Step: {rejected_step}")

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
                      "assigned_at": datetime.now().isoformat(),
                      "comment": submit_data.resubmission_comment # The correction note from user
                  }
                  client.table('requisition_approvals').insert(new_step_data).execute()
                  
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
                    "action_at": datetime.now().isoformat() if is_auto_approved else None, 
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
                    "assigned_at": datetime.now().isoformat() if s['status'] in [StepStatus.PENDING, StepStatus.APPROVED] else None,
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
            "action_at": datetime.now().isoformat(),
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
                "assigned_at": datetime.now().isoformat()
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
        
        # 2. Update Step to REJECTED
        client.table('requisition_approvals').update({
            "step_status": 'REJECTED',
            "action_at": datetime.now().isoformat(),
            "action_by_user_id": str(user_id),
            "comment": data.comment
        }).eq('id', current_step['id']).execute()
        
        # 3. Update Requisition Status
        client.table('requisitions').update({
            "status": 'REWORK_REQUIRED'
        }).eq('id', req_id).execute()
        
        return RequisitionService.get_requisition_by_id(req_id)
        
    @staticmethod
    def cancel_requisition(req_id: str, user_id: UUID) -> Dict[str, Any]:
        client = RequisitionService._get_admin_client()
        client.table('requisitions').update({
            "status": RequisitionStatus.CANCELED,
            "closed_at": datetime.now().isoformat()
        }).eq('id', req_id).execute()
        
        return RequisitionService.get_requisition_by_id(req_id)

    @staticmethod
    def get_inbox(user_id: UUID) -> List[Dict[str, Any]]:
        client = RequisitionService._get_admin_client()
        print(f"\n[DEBUG] get_inbox for user_id: {user_id}")
        
        # Debug: Check if there are ANY approvals for this user, ignoring status
        all_aps = client.table('requisition_approvals').select('*').eq('assigned_to_user_id', str(user_id)).execute()
        print(f"[DEBUG] Total assignments for user: {len(all_aps.data)}")
        for ap in all_aps.data:
            s_status = ap.get('step_status')
            print(f"  - Step: {ap.get('step_name')}, Status: '{s_status}', ReqID: {ap.get('requisition_id')}")

        # Explicitly using string 'PENDING' to avoid Enum issues
        steps = client.table('requisition_approvals').select('requisition_id')\
            .eq('assigned_to_user_id', str(user_id))\
            .eq('step_status', 'PENDING')\
            .execute()
            
        print(f"[DEBUG] Pending steps found: {len(steps.data)}")

        if not steps.data:
            return []
            
        req_ids = list(set([s['requisition_id'] for s in steps.data]))
        print(f"[DEBUG] Req IDs to fetch: {req_ids}")
        
        if not req_ids:
             return []
             
        res = client.table('requisitions').select('*, items:requisition_items(*), requester:profiles!requester_id(*), creator:profiles!created_by(*), approvals:requisition_approvals(*, approver:profiles!assigned_to_user_id(*))').in_('id', req_ids).execute()
            
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
        
        query = client.table('requisitions').select('*, items:requisition_items(*), requester:profiles!requester_id(*), creator:profiles!created_by(*), approvals:requisition_approvals(*, approver:profiles!assigned_to_user_id(*))').order('created_at', desc=True)
        if status:
            query = query.eq('status', status)
        if requester_id:
            query = query.eq('requester_id', str(requester_id))
        query = query.range(skip, skip + limit - 1)
        res = query.execute()
        return res.data

    @staticmethod
    def get_requisition_by_id(req_id: str) -> Dict[str, Any]:
        # Use admin client to ensure visibility
        client = RequisitionService._get_admin_client()
        
        res = client.table('requisitions').select('*, items:requisition_items(*), requester:profiles!requester_id(*), creator:profiles!created_by(*), approvals:requisition_approvals(*, approver:profiles!assigned_to_user_id(*))').eq('id', req_id).single().execute()
        if not res.data:
             raise HTTPException(status_code=404, detail="Requisition not found")
             
        if 'approvals' in res.data:
            res.data['approvals'].sort(key=lambda x: x['step_order'])
            
        return res.data
