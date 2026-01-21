
from typing import Any, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from app.core.deps import get_current_user
from app.services.cycle_count_service import CycleCountService
from app.schemas.cycle_count import CycleCountSessionCreate, CycleCountLineCreate

router = APIRouter()

@router.get("/", response_model=List[Any])
def get_sessions(current_user: Any = Depends(get_current_user)):
    print(f"DEBUG: Fetching sessions for user {current_user.id}")
    return CycleCountService.get_sessions()

@router.post("/", response_model=Any)
def create_session(
    data: CycleCountSessionCreate,
    current_user: Any = Depends(get_current_user)
):
    print(f"DEBUG: Creating session. Data: {data}, User: {current_user.id}")
    try:
        result = CycleCountService.create_session(data, current_user.id)
        print(f"DEBUG: Session created successfully: {result}")
        return result
    except Exception as e:
        print(f"DEBUG: Error creating session: {e}")
        raise e

@router.get("/{id}", response_model=Any)
def get_session_detail(
    id: UUID,
    current_user: Any = Depends(get_current_user)
):
    return CycleCountService.get_session_by_id(id)

@router.post("/{id}/lines", response_model=Any)
def add_line(
    id: UUID,
    data: CycleCountLineCreate,
    current_user: Any = Depends(get_current_user)
):
    return CycleCountService.add_line(id, data, current_user.id)

@router.patch("/{id}", response_model=Any)
def update_session(
    id: UUID,
    data: dict,
    current_user: Any = Depends(get_current_user)
):
    return CycleCountService.update_session(id, data)
