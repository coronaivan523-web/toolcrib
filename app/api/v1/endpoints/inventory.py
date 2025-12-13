from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException
from app.core.deps import get_current_active_user
from app.core.supabase import supabase
from app.schemas.inventory import (
    MaterialCreate, MaterialUpdate, MaterialResponse,
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

# --- Materials ---

@router.get("/materials", response_model=List[MaterialResponse])
def read_materials(
    skip: int = 0,
    limit: int = 100,
    current_user = Depends(get_current_active_user),
) -> Any:
    """
    Retrieve materials.
    """
    res = supabase.table('materials').select('*').range(skip, skip + limit - 1).execute()
    return res.data

@router.post("/materials", response_model=MaterialResponse)
def create_material(
    *,
    material_in: MaterialCreate,
    current_user = Depends(get_current_active_user),
) -> Any:
    """
    Create new material.
    """
    # Check SKU
    existing = supabase.table('materials').select('sku').eq('sku', material_in.sku).execute()
    if existing.data:
         raise HTTPException(
            status_code=400,
            detail="The material with this SKU already exists.",
        )
    
    # Verify location
    if material_in.location_id:
        loc = supabase.table('locations').select('id').eq('id', material_in.location_id).execute()
        if not loc.data:
            raise HTTPException(status_code=404, detail="Location not found")
            
    res = supabase.table('materials').insert(material_in.dict()).execute()
    return res.data[0]

@router.get("/materials/{material_id}", response_model=MaterialResponse)
def read_material(
    material_id: int,
    current_user = Depends(get_current_active_user),
) -> Any:
    """
    Get material by ID.
    """
    res = supabase.table('materials').select('*').eq('id', material_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Material not found")
    return res.data

@router.put("/materials/{material_id}", response_model=MaterialResponse)
def update_material(
    *,
    material_id: int,
    material_in: MaterialUpdate,
    current_user = Depends(get_current_active_user),
) -> Any:
    """
    Update a material.
    """
    updates = material_in.dict(exclude_unset=True)
    if not updates:
        return read_material(material_id, current_user)
        
    res = supabase.table('materials').update(updates).eq('id', material_id).execute()
    if not res.data:
         raise HTTPException(status_code=404, detail="Material not found")
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
