from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from fastapi import HTTPException

from app.core.supabase import supabase
from app.schemas.requisition import (
    RequisitionCreate, RequisitionStatus, ApprovalAction, RequisitionPriority, 
    StepStatus, ApprovalStepName, RequisitionSubmit, RequisitionApprove, RequisitionReject
)

class RequisitionService:
    
    @staticmethod
    def create_draft(requester_id: UUID, data: RequisitionCreate) -> Dict[str, Any]:
        # 1. Insert Requisition (DRAFT)
        req_data = {
            "requester_id": str(requester_id),
            "priority": data.priority,
            "justification": data.justification,
            "status": RequisitionStatus.DRAFT,
            # V2 Fields
            "purchase_justification": data.purchase_justification,
            "department": data.department,
            "job_title": data.job_title,
            "cause": data.cause,
            "criticality_requested": data.criticality_requested,
            "criticality_assigned": data.criticality_assigned
        }
        res = supabase.table('requisitions').insert(req_data).execute()
        
        if not res.data:
            raise HTTPException(status_code=500, detail="Failed to create requisition")
            
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
                    "monthly_consumption": item.monthly_consumption
                })
            
            supabase.table('requisition_items').insert(items_data).execute()

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
            supabase.table('requisition_attachments').insert(att_data).execute()
            
        return RequisitionService.get_requisition_by_id(req_id)

    @staticmethod
    def submit_requisition(req_id: str, submit_data: RequisitionSubmit, user_id: UUID) -> Dict[str, Any]:
        # 1. Get Current
        req = RequisitionService.get_requisition_by_id(req_id)
        if req['status'] not in [RequisitionStatus.DRAFT, RequisitionStatus.REWORK_REQUIRED]:
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
        update_data = {
            "status": RequisitionStatus.UNDER_APPROVAL,
            "submitted_at": datetime.now().isoformat(),
            "req_number": req_number,
            "gerente_mx_id": str(submit_data.gerente_mx_id),
            "gerente_ch_id": str(submit_data.gerente_ch_id),
            "gerente_gral_id": str(submit_data.gerente_gral_id) if submit_data.gerente_gral_id else None
        }
        supabase.table('requisitions').update(update_data).eq('id', req_id).execute()
        
        # 4. Create/Reset Workflow Steps
        if req['status'] == RequisitionStatus.REWORK_REQUIRED:
            # Resubmit Logic (Robust)
            # a) Ensure no steps are currently PENDING (sanity check)
            supabase.table('requisition_approvals').update({'step_status': StepStatus.WAITING}).eq('requisition_id', req_id).eq('step_status', StepStatus.PENDING).execute()
            
            # b) Find the rejected step
            approvals = req.get('approvals', [])
            rejected_step = None
            for step in approvals:
                 if step['step_status'] == StepStatus.REJECTED:
                     rejected_step = step
                     break
                     
            if rejected_step:
                 # c) Set all FUTURE steps (order > rejected) to WAITING (reset them if they were skipped or messed up)
                 supabase.table('requisition_approvals').update({'step_status': StepStatus.WAITING})\
                     .eq('requisition_id', req_id)\
                     .gt('step_order', rejected_step['step_order'])\
                     .execute()

                 # d) Reset THIS rejected step to PENDING
                 supabase.table('requisition_approvals').update({
                     'step_status': StepStatus.PENDING,
                     'assigned_at': datetime.now().isoformat(),
                     'action_at': None,
                     'action_by_user_id': None,
                     'comment': None
                 }).eq('id', rejected_step['id']).execute()
                 
        else:
            # New Submission (From DRAFT) -> Create All Steps
            steps_config = [
                {
                    "step_order": 1, "step_name": ApprovalStepName.SOLICITANTE, 
                    "assigned_to": str(user_id), "status": StepStatus.APPROVED, # Auto Approved
                    "action_at": datetime.now().isoformat(), "action_by": str(user_id)
                },
                {
                    "step_order": 2, "step_name": ApprovalStepName.GERENTE_MX, 
                    "assigned_to": str(submit_data.gerente_mx_id), "status": StepStatus.PENDING
                },
                {
                    "step_order": 3, "step_name": ApprovalStepName.GERENTE_CH, 
                    "assigned_to": str(submit_data.gerente_ch_id), "status": StepStatus.WAITING
                }
            ]
            
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
                
            supabase.table('requisition_approvals').insert(approvals_data).execute()

        return RequisitionService.get_requisition_by_id(req_id)

    @staticmethod
    def approve_step(req_id: str, user_id: UUID, data: RequisitionApprove) -> Dict[str, Any]:
        # 1. Find Pending Step for User
        res = supabase.table('requisition_approvals').select('*')\
            .eq('requisition_id', req_id)\
            .eq('step_status', StepStatus.PENDING)\
            .eq('assigned_to_user_id', str(user_id))\
            .execute()
            
        if not res.data:
             raise HTTPException(status_code=403, detail="No pending approval found for this user")
        
        current_step = res.data[0]
        
        # 2. Update Current Step to APPROVED
        supabase.table('requisition_approvals').update({
            "step_status": StepStatus.APPROVED,
            "action_at": datetime.now().isoformat(),
            "action_by_user_id": str(user_id),
            "comment": data.comment
        }).eq('id', current_step['id']).execute()
        
        # 3. Activate Next Step (Sequential)
        next_steps = supabase.table('requisition_approvals').select('*')\
            .eq('requisition_id', req_id)\
            .gt('step_order', current_step['step_order'])\
            .order('step_order')\
            .limit(1)\
            .execute()
            
        if next_steps.data:
            next_step = next_steps.data[0]
            # Set Next to PENDING
            supabase.table('requisition_approvals').update({
                "step_status": StepStatus.PENDING,
                "assigned_at": datetime.now().isoformat()
            }).eq('id', next_step['id']).execute()
            
            # Req Status remains UNDER_APPROVAL
        else:
            # No next step -> Final Approval
            supabase.table('requisitions').update({
                "status": RequisitionStatus.APPROVED_PRE_PURCHASE
            }).eq('id', req_id).execute()
            
        return RequisitionService.get_requisition_by_id(req_id)

    @staticmethod
    def reject_step(req_id: str, user_id: UUID, data: RequisitionReject) -> Dict[str, Any]:
        # 1. Find Pending Step
        res = supabase.table('requisition_approvals').select('*')\
            .eq('requisition_id', req_id)\
            .eq('step_status', StepStatus.PENDING)\
            .eq('assigned_to_user_id', str(user_id))\
            .execute()
            
        if not res.data:
             raise HTTPException(status_code=403, detail="No pending approval found for this user")
        
        current_step = res.data[0]
        
        # 2. Update Step to REJECTED
        supabase.table('requisition_approvals').update({
            "step_status": StepStatus.REJECTED,
            "action_at": datetime.now().isoformat(),
            "action_by_user_id": str(user_id),
            "comment": data.comment
        }).eq('id', current_step['id']).execute()
        
        # 3. Update Requisition Status
        supabase.table('requisitions').update({
            "status": RequisitionStatus.REWORK_REQUIRED
        }).eq('id', req_id).execute()
        
        return RequisitionService.get_requisition_by_id(req_id)
        
    @staticmethod
    def cancel_requisition(req_id: str, user_id: UUID) -> Dict[str, Any]:
        supabase.table('requisitions').update({
            "status": RequisitionStatus.CANCELED,
            "closed_at": datetime.now().isoformat()
        }).eq('id', req_id).execute()
        
        return RequisitionService.get_requisition_by_id(req_id)

    @staticmethod
    def get_inbox(user_id: UUID) -> List[Dict[str, Any]]:
        steps = supabase.table('requisition_approvals').select('requisition_id')\
            .eq('assigned_to_user_id', str(user_id))\
            .eq('step_status', StepStatus.PENDING)\
            .execute()
            
        if not steps.data:
            return []
            
        req_ids = list(set([s['requisition_id'] for s in steps.data]))
        
        if not req_ids:
             return []
             
        res = supabase.table('requisitions').select('*, items:requisition_items(*), requester:profiles!requester_id(*)')\
            .in_('id', req_ids)\
            .execute()
            
        return res.data

    @staticmethod
    def get_requisitions(
        skip: int = 0, 
        limit: int = 100, 
        status: Optional[str] = None,
        requester_id: Optional[UUID] = None
    ) -> List[Dict[str, Any]]:
        query = supabase.table('requisitions').select('*, items:requisition_items(*), requester:profiles!requester_id(*)').order('created_at', desc=True)
        if status:
            query = query.eq('status', status)
        if requester_id:
            query = query.eq('requester_id', str(requester_id))
        query = query.range(skip, skip + limit - 1)
        res = query.execute()
        return res.data

    @staticmethod
    def get_requisition_by_id(req_id: str) -> Dict[str, Any]:
        res = supabase.table('requisitions').select('*, items:requisition_items(*), requester:profiles!requester_id(*), approvals:requisition_approvals(*)').eq('id', req_id).single().execute()
        if not res.data:
             raise HTTPException(status_code=404, detail="Requisition not found")
             
        if 'approvals' in res.data:
            res.data['approvals'].sort(key=lambda x: x['step_order'])
            
        return res.data
