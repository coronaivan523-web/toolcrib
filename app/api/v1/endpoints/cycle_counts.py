
from typing import Any, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from app.core.deps import get_current_user
from app.api import deps
from app.services.cycle_count_service import CycleCountService
from app.schemas.cycle_count import CycleCountSessionCreate, CycleCountLineCreate

router = APIRouter()

@router.get("/", response_model=List[Any])
def get_sessions(
    current_user: Any = Depends(get_current_user),
    current_client: Client = Depends(deps.get_supabase_client)
):
    print(f"DEBUG: Fetching sessions for user {current_user.id}")
    return CycleCountService.get_sessions(current_client)

@router.get("/active_lines", response_model=List[Any])
def get_active_lines(
    current_user: Any = Depends(get_current_user),
    current_client: Client = Depends(deps.get_supabase_client)
):
    """ Get all pending lines (assigned but not counted) globally. """
    return CycleCountService.get_active_lines(current_client)

@router.post("/", response_model=Any)
def create_session(
    data: CycleCountSessionCreate,
    current_user: Any = Depends(get_current_user),
    current_client: Client = Depends(deps.get_supabase_client)
):
    print(f"DEBUG: Creating session. Data: {data}, User: {current_user.id}")
    try:
        result = CycleCountService.create_session(data, current_user.id, current_client)
        print(f"DEBUG: Session created successfully: {result}")
        return result
    except Exception as e:
        print(f"DEBUG: Error creating session: {e}")
        raise e

@router.get("/{id}", response_model=Any)
def get_session_detail(
    id: UUID,
    current_user: Any = Depends(get_current_user),
    current_client: Client = Depends(deps.get_supabase_client)
):
    return CycleCountService.get_session_by_id(id, current_client)

@router.post("/{id}/lines", response_model=Any)
def add_line(
    id: UUID,
    data: CycleCountLineCreate,
    current_user: Any = Depends(get_current_user),
    current_client: Client = Depends(deps.get_supabase_client)
):
    return CycleCountService.add_line(id, data, current_user.id, current_client)

@router.patch("/{id}", response_model=Any)
def update_session(
    id: UUID,
    data: dict,
    current_user: Any = Depends(get_current_user),
    current_client: Client = Depends(deps.get_supabase_client)
):
    return CycleCountService.update_session(id, data, current_client)

@router.patch("/lines/{line_id}", response_model=Any)
def update_line(
    line_id: UUID,
    data: dict,
    current_user: Any = Depends(get_current_user),
    current_client: Client = Depends(deps.get_supabase_client)
):
    return CycleCountService.update_line(line_id, data, current_client)

@router.post("/{id}/commit", response_model=dict)
def commit_session(
    id: UUID,
    current_user: dict = Depends(get_current_user),
    current_client: Client = Depends(deps.get_supabase_client)
):
    try:
        user_id = current_user.get('id')
        return CycleCountService.commit_session(id, user_id, current_client)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
