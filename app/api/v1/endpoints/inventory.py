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
    res = supabase.table('locations').select('*').range(skip, skip + limit - 1).execute()
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
    # Check existence
    existing = supabase.table('locations').select('code').eq('code', location_in.code).execute()
    if existing.data:
        raise HTTPException(
            status_code=400,
            detail="The location with this code already exists.",
        )
    
    res = supabase.table('locations').insert(location_in.dict()).execute()
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
    # user_id should be string UUID now
    return InventoryService.create_movement(movement_in=movement_in, user_id=str(current_user.id))

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
    res = supabase.table('inventory_movements').select('*')\
        .eq('material_id', material_id)\
        .order('timestamp', desc=True)\
        .range(skip, skip + limit - 1)\
        .execute()
    return res.data
