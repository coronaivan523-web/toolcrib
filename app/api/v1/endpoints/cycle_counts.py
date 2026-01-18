from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from app.core.deps import get_current_user
from app.schemas.cycle_count import (
    CycleCountSessionCreate, 
    CycleCountSessionResponse, 
    CycleCountLineCreate, 
    CycleCountLineResponse
)
from app.services.cycle_count_service import CycleCountService

router = APIRouter()

@router.get("/", response_model=List[CycleCountSessionResponse])
def get_sessions(
    status: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    return CycleCountService.get_sessions(status)

@router.post("/", response_model=CycleCountSessionResponse)
def create_session(
    data: CycleCountSessionCreate,
    current_user = Depends(get_current_user)
):
    # Any staff can create
    return CycleCountService.create_session(data, current_user.id)

@router.get("/{id}", response_model=CycleCountSessionResponse)
def get_session_detail(
    id: UUID,
    current_user = Depends(get_current_user)
):
    return CycleCountService.get_session_by_id(id)

@router.post("/{id}/lines", response_model=CycleCountLineResponse)
def add_line(
    id: UUID,
    data: CycleCountLineCreate,
    current_user = Depends(get_current_user)
):
    return CycleCountService.add_line(id, data, current_user.id)

@router.delete("/{id}/lines/{line_id}")
def delete_line(
    id: UUID,
    line_id: UUID,
    current_user = Depends(get_current_user)
):
    return CycleCountService.delete_line(line_id)

@router.post("/{id}/submit", response_model=CycleCountSessionResponse)
def submit_session(
    id: UUID,
    current_user = Depends(get_current_user)
):
    return CycleCountService.submit_session(id)

@router.post("/{id}/approve", response_model=CycleCountSessionResponse)
def approve_session(
    id: UUID,
    current_user = Depends(get_current_user)
):
    # Role Check
    role = current_user.role.name
    if role not in ['admin', 'supervisor']:
        raise HTTPException(status_code=403, detail="Only supervisors can approve adjustments")
        
    return CycleCountService.approve_session(id, current_user.id)

@router.post("/{id}/reject", response_model=CycleCountSessionResponse)
def reject_session(
    id: UUID,
    current_user = Depends(get_current_user)
):
    # Role Check
    role = current_user.role.name
    if role not in ['admin', 'supervisor']:
        raise HTTPException(status_code=403, detail="Only supervisors can reject counts")

    return CycleCountService.reject_session(id, current_user.id)
