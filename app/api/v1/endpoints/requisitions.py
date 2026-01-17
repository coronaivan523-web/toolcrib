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
    RequisitionStatus,
    IncomingPayload,
    RequisitionUpdate
)
from app.services.requisition_service import RequisitionService

router = APIRouter()
print("DEBUG: requisitions.py module loaded. Incoming Endpoint Active!")

@router.post("/{requisition_id}/incoming", response_model=RequisitionResponse)
def incoming_materials(
    requisition_id: str,
    payload: IncomingPayload,
    current_user = Depends(get_current_active_user),
) -> Any:
    """ Process incoming materials. """
    # Ideally check permissions here (e.g. toolroom_staff only)
    return RequisitionService.incoming_materials(requisition_id, payload.items, current_user.id)

# --- Permissions Helpers ---
def check_create_permission(user):
    # Allowed: process_engineer, coordinator, toolcrib_admin, admin
    # Use Service optimized check (Admin Client)
    role_name = RequisitionService.get_user_role(user.id)
        
    # Authorized Roles for Create/Submit
    allowed = ['admin', 'process_engineer', 'coordinator', 'toolroom_staff', 'supervisor', 'staff_level_1', 'staff_level_2'] 
    
    strict_allowed = ['admin', 'toolroom_staff', 'supervisor', 'staff_level_1', 'staff_level_2']
    
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
    
    # Force DB lookup for role to ensure accuracy (metadata in token might be stale)
    try:
        profile_res = supabase.table('profiles').select('role').eq('id', current_user.id).single().execute()
        role_name = profile_res.data.get('role', 'user') if profile_res.data else 'user'
    except:
        role_name = 'user'
    
    try:
        with open("backend_debug_router.log", "a") as f:
             f.write(f"API Evaluated Role: {role_name}\n")
    except:
        pass

    # Authorized roles that can see ALL requisitions
    privileged_roles = ['admin', 'manager', 'toolroom_staff', 'process_engineer', 'coordinator', 'supervisor', 'head_of_department']
    
    if role_name not in privileged_roles:
        requester_id = current_user.id
        try:
             with open("backend_debug_router.log", "a") as f:
                  f.write(f"Standard user detected. Filtering by requester_id={requester_id}\n")
        except: pass
    else:
        try:
             with open("backend_debug_router.log", "a") as f:
                  f.write(f"Privileged user detected. No ID filter passed to service.\n")
        except: pass
        
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
    try:
        print(f"\\n[DEBUG] create_draft called by {current_user.email}")
        print(f"[DEBUG] Payload: {requisition_in.dict()}")
        check_create_permission(current_user)
        # Use requester_id from payload if available, else creator
        target_requester_id = requisition_in.requester_id or current_user.id
        return RequisitionService.create_draft(target_requester_id, requisition_in, creator_id=current_user.id)
    except Exception as e:
        print(f"[ERROR] create_draft failed: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{requisition_id}", response_model=RequisitionResponse)
def update_requisition(
    requisition_id: str,
    update_data: RequisitionUpdate,
    current_user = Depends(get_current_active_user),
) -> Any:
    """ Update draft/rework requisition. """
    check_create_permission(current_user)
    return RequisitionService.update_requisition(requisition_id, update_data, current_user.id)

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
    """ Reject current pending step (Request Rework). Comment mandatory. """
    return RequisitionService.reject_step(requisition_id, current_user.id, reject_data)

@router.post("/{requisition_id}/reject-final", response_model=RequisitionResponse)
def reject_final(
    requisition_id: str,
    reject_data: RequisitionReject,
    current_user = Depends(get_current_active_user),
) -> Any:
    """ Permanently reject the requisition. Comment mandatory. """
    return RequisitionService.reject_final(requisition_id, current_user.id, reject_data)

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
    current_user: Any = Depends(get_current_active_user)
):
    # check_create_permission(current_user)
    # FOR DEBUGGING ONLY - ALLOW ALL
    pass
    return RequisitionService.submit_requisition(requisition_id, submit_data, current_user.id)

@router.get("/{requisition_id}/usage-history")
def usage_history(
    requisition_id: str,
    current_user = Depends(get_current_active_user),
) -> Any:
    """ Stub for consumption history. """
    return {"message": "Usage history feature pending integration with Ticket/Movement tables."}
