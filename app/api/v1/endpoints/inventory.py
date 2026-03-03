from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException
from app.core.deps import get_current_active_user
from app.core.supabase import supabase
from app.schemas.inventory import (
    LocationCreate, LocationResponse
)
from app.schemas.inventory_movement import InventoryMovementCreate, InventoryMovementResponse
from app.services.inventory_service import InventoryService

router = APIRouter()

# --- Locations ---

@router.get("/locations", response_model=List[LocationResponse])
def read_locations(
    skip: int = 0,
    limit: int = 100,
    current_user = Depends(get_current_active_user),
) -> Any:
    """
    Retrieve locations.
    """
    client = InventoryService.get_user_client(current_user.token)
    res = client.table('locations').select('*').range(skip, skip + limit - 1).execute()
    return res.data

@router.post("/locations", response_model=LocationResponse)
def create_location(
    *,
    location_in: LocationCreate,
    current_user = Depends(get_current_active_user),
) -> Any:
    """
    Create new location.
    """
    client = InventoryService.get_user_client(current_user.token)
    # Check existence
    existing = client.table('locations').select('code').eq('code', location_in.code).execute()
    if existing.data:
        raise HTTPException(
            status_code=400,
            detail="The location with this code already exists.",
        )
    
    res = client.table('locations').insert(location_in.dict()).execute()
    return res.data[0]


# --- Inventory Movements (Kardex) ---

@router.post("/movements", response_model=InventoryMovementResponse)
def create_movement(
    *,
    movement_in: InventoryMovementCreate,
    current_user = Depends(get_current_active_user),
) -> Any:
    """
    Register a new inventory movement.
    """
    # 1. Role Gate (HC-4 Fase 2)
    role_name = getattr(current_user.role, 'name', 'user') if current_user and hasattr(current_user, 'role') else 'user'
    strict_allowed = ["admin", "supervisor", "toolroom_staff", "Toolroom", "Admin", "Supervisor"]
    # Normalize comparison case-insensitively just in case
    if not any(role_name.lower() == r.lower() for r in strict_allowed):
         raise HTTPException(status_code=403, detail=f"Role '{role_name}' not authorized to execute inventory movements")

    # user_id should be string UUID now
    return InventoryService.create_movement(movement_in=movement_in, current_user=current_user)

@router.get("/movements/{material_id}", response_model=List[InventoryMovementResponse])
def read_kardex(
    material_id: int,
    skip: int = 0,
    limit: int = 100,
    current_user = Depends(get_current_active_user),
) -> Any:
    """
    Get inventory history (Kardex) for a specific material.
    """
    client = InventoryService.get_user_client(current_user.token)
    res = client.table('inventory_movements').select('*')\
        .eq('material_id', material_id)\
        .order('timestamp', desc=True)\
        .range(skip, skip + limit - 1)\
        .execute()
    return res.data
