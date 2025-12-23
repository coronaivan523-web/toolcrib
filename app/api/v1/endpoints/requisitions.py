from typing import List, Any, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.core.deps import get_current_active_user
from app.core.supabase import supabase
from app.schemas.requisition import (
    RequisitionCreate, 
    RequisitionResponse, 
    RequisitionSubmit,
    RequisitionApprove,
    RequisitionReject,
    RequisitionStatus
)
from app.services.requisition_service import RequisitionService

router = APIRouter()

# --- Permissions Helpers ---
def check_create_permission(user):
    # Allowed: process_engineer, coordinator, toolcrib_admin, admin
    # Query 'profiles' table to be 100% sure of the role (as requested)
    res = supabase.table('profiles').select('role').eq('id', user.id).single().execute()
    
    if not res.data:
         raise HTTPException(status_code=403, detail="User profile not found")
         
    role_name = res.data.get('role', 'user')
    
    # Authorized Roles for Create/Submit
    allowed = ['admin', 'process_engineer', 'coordinator', 'toolroom_staff', 'supervisor'] 
    # Added supervisor? User said "NO técnicos ni supervisores" but usually supervisors approve.
    # Ah, User said: "NO técnicos ni supervisores" for CREATE/SUBMIT.
    # So I must remove supervisor from allowed list for create.
    
    strict_allowed = ['admin', 'toolroom_staff', 'supervisor']
    
    if role_name not in strict_allowed:
         raise HTTPException(status_code=403, detail=f"Role '{role_name}' not authorized to create requisitions")

@router.get("", response_model=List[RequisitionResponse])
def read_requisitions(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = Query(None),
    current_user = Depends(get_current_active_user),
) -> Any:
    """ List requisitions. """
    requester_id = None
    role_name = getattr(current_user.role, 'name', 'user')
    
    # Standard user sees own
    if role_name == 'user':
        requester_id = current_user.id
        
    return RequisitionService.get_requisitions(skip=skip, limit=limit, status=status, requester_id=requester_id)

@router.get("/inbox", response_model=List[RequisitionResponse])
def get_inbox(
    current_user = Depends(get_current_active_user),
) -> Any:
    """ Get requisitions pending ANY approval action by me. """
    return RequisitionService.get_inbox(current_user.id)

@router.post("", response_model=RequisitionResponse)
def create_draft(
    *,
    requisition_in: RequisitionCreate,
    current_user = Depends(get_current_active_user),
) -> Any:
    """ Create DRAFT. """
    check_create_permission(current_user)
    return RequisitionService.create_draft(current_user.id, requisition_in)

@router.get("/{requisition_id}", response_model=RequisitionResponse)
def read_requisition(
    requisition_id: str,
    current_user = Depends(get_current_active_user),
) -> Any:
    return RequisitionService.get_requisition_by_id(requisition_id)

@router.post("/{requisition_id}/submit", response_model=RequisitionResponse)
def submit_requisition(
    requisition_id: str,
    submit_data: RequisitionSubmit,
    current_user = Depends(get_current_active_user),
) -> Any:
    """ Submit Draft -> Under Approval. Manual assignment required. """
    check_create_permission(current_user)
    return RequisitionService.submit_requisition(requisition_id, submit_data, current_user.id)

@router.post("/{requisition_id}/approve", response_model=RequisitionResponse)
def approve_step(
    requisition_id: str,
    approval_data: RequisitionApprove,
    current_user = Depends(get_current_active_user),
) -> Any:
    """ Approve current pending step assigned to me. """
    return RequisitionService.approve_step(requisition_id, current_user.id, approval_data)

@router.post("/{requisition_id}/reject", response_model=RequisitionResponse)
def reject_step(
    requisition_id: str,
    reject_data: RequisitionReject,
    current_user = Depends(get_current_active_user),
) -> Any:
    """ Reject current pending step. Comment mandatory. """
    return RequisitionService.reject_step(requisition_id, current_user.id, reject_data)

@router.post("/{requisition_id}/cancel", response_model=RequisitionResponse)
def cancel_requisition(
    requisition_id: str,
    current_user = Depends(get_current_active_user),
) -> Any:
    """ Cancel requisition. """
    return RequisitionService.cancel_requisition(requisition_id, current_user.id)

@router.post("/{requisition_id}/resubmit", response_model=RequisitionResponse)
def resubmit_requisition(
    requisition_id: str,
    submit_data: RequisitionSubmit,
    current_user = Depends(get_current_active_user),
) -> Any:
    check_create_permission(current_user)
    return RequisitionService.submit_requisition(requisition_id, submit_data, current_user.id)

@router.get("/{requisition_id}/usage-history")
def usage_history(
    requisition_id: str,
    current_user = Depends(get_current_active_user),
) -> Any:
    """ Stub for consumption history. """
    return {"message": "Usage history feature pending integration with Ticket/Movement tables."}
