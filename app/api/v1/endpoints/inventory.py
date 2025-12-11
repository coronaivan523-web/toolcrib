from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_active_user
from app.models.inventory import Material, Location, InventoryMovement
from app.models.user import User
from app.schemas.inventory import (
    MaterialCreate, MaterialUpdate, MaterialResponse,
    LocationCreate, LocationUpdate, LocationResponse
)
from app.schemas.inventory_movement import InventoryMovementCreate, InventoryMovementResponse
from app.services.inventory_service import InventoryService

router = APIRouter()

# --- Locations ---

@router.get("/locations", response_model=List[LocationResponse])
def read_locations(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Retrieve locations.
    """
    locations = db.query(Location).offset(skip).limit(limit).all()
    return locations

@router.post("/locations", response_model=LocationResponse)
def create_location(
    *,
    db: Session = Depends(get_db),
    location_in: LocationCreate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Create new location.
    """
    location = db.query(Location).filter(Location.code == location_in.code).first()
    if location:
        raise HTTPException(
            status_code=400,
            detail="The location with this code already exists.",
        )
    location = Location(**location_in.dict())
    db.add(location)
    db.commit()
    db.refresh(location)
    return location

# --- Materials ---

@router.get("/materials", response_model=List[MaterialResponse])
def read_materials(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Retrieve materials.
    """
    materials = db.query(Material).offset(skip).limit(limit).all()
    return materials

@router.post("/materials", response_model=MaterialResponse)
def create_material(
    *,
    db: Session = Depends(get_db),
    material_in: MaterialCreate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Create new material.
    """
    material = db.query(Material).filter(Material.sku == material_in.sku).first()
    if material:
        raise HTTPException(
            status_code=400,
            detail="The material with this SKU already exists.",
        )
    
    # Verify location if provided
    if material_in.location_id:
        location = db.query(Location).filter(Location.id == material_in.location_id).first()
        if not location:
            raise HTTPException(
                status_code=404,
                detail="Location not found",
            )

    material = Material(**material_in.dict())
    db.add(material)
    db.commit()
    db.refresh(material)
    return material

@router.get("/materials/{material_id}", response_model=MaterialResponse)
def read_material(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Get material by ID.
    """
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    return material

@router.put("/materials/{material_id}", response_model=MaterialResponse)
def update_material(
    *,
    db: Session = Depends(get_db),
    material_id: int,
    material_in: MaterialUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Update a material.
    """
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    update_data = material_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(material, field, value)
        
    db.add(material)
    db.commit()
    db.refresh(material)
    return material

# --- Inventory Movements (Kardex) ---

@router.post("/movements", response_model=InventoryMovementResponse)
def create_movement(
    *,
    db: Session = Depends(get_db),
    movement_in: InventoryMovementCreate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Register a new inventory movement (IN, OUT, ADJUSTMENT).
    """
    return InventoryService.create_movement(db=db, movement_in=movement_in, user_id=current_user.id)

@router.get("/movements/{material_id}", response_model=List[InventoryMovementResponse])
def read_kardex(
    material_id: int,
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Get inventory history (Kardex) for a specific material.
    """
    movements = db.query(InventoryMovement).filter(
        InventoryMovement.material_id == material_id
    ).order_by(InventoryMovement.timestamp.desc()).offset(skip).limit(limit).all()
    
    return movements
