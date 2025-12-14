from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime
from enum import Enum
from app.core.enums import MovementType

# Location Schemas
class LocationBase(BaseModel):
    code: str
    description: Optional[str] = None

class LocationCreate(LocationBase):
    pass

class LocationUpdate(LocationBase):
    code: Optional[str] = None

class LocationResponse(LocationBase):
    id: int
    
    class Config:
        from_attributes = True

# Material Schemas
class MaterialBase(BaseModel):
    part_number: str
    name: str
    description: Optional[str] = None
    category: str
    unit_of_measure: str
    min_stock: int = 0
    max_stock: int = 0
    location: Optional[str] = None
    location_id: Optional[int] = None # Deprecated? Keeping for compatibility if needed or remove. User wants text.
    image_url: Optional[str] = None
    process: Optional[str] = None
    Area: Optional[str] = None
    material_type: Optional[str] = 'spare_part'
    abc_class: Optional[str] = 'B'
    origin_country: Optional[str] = 'MX'
    requested_by: Optional[str] = None
    requested_by_position: Optional[str] = None
    registered_by: Optional[str] = None
    status: Optional[str] = 'active'
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class MaterialCreate(MaterialBase):
    pass

class MaterialUpdate(MaterialBase):
    part_number: Optional[str] = None
    name: Optional[str] = None
    category: Optional[str] = None
    unit_of_measure: Optional[str] = None
    min_stock: Optional[int] = None
    max_stock: Optional[int] = None
    current_stock: Optional[int] = None
    created_at: Optional[datetime] = None # Allow overwriting for traceability "reset"
    registered_by: Optional[str] = None
    requested_by: Optional[str] = None
    status: Optional[str] = None

class MaterialResponse(MaterialBase):
    id: int
    current_stock: int
    location: Optional[LocationResponse] = None
    
    class Config:
        from_attributes = True

# Movement Schemas
# Movement Schemas
# MovementType imported from app.core.enums

class InventoryMovementBase(BaseModel):
    material_id: int
    movement_type: MovementType
    quantity: int
    reference_type: str
    reference_id: Optional[int] = None
    notes: Optional[str] = None

class InventoryMovementCreate(InventoryMovementBase):
    pass

class InventoryMovementResponse(InventoryMovementBase):
    id: int
    user_id: int
    timestamp: datetime
    
    class Config:
        from_attributes = True
