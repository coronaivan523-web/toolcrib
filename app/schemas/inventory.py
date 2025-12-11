from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime
from enum import Enum

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
    sku: str
    name: str
    description: Optional[str] = None
    category: str
    unit_of_measure: str
    min_stock: int = 0
    max_stock: int = 0
    location_id: Optional[int] = None
    image_url: Optional[str] = None

class MaterialCreate(MaterialBase):
    pass

class MaterialUpdate(MaterialBase):
    sku: Optional[str] = None
    name: Optional[str] = None
    category: Optional[str] = None
    unit_of_measure: Optional[str] = None
    min_stock: Optional[int] = None
    max_stock: Optional[int] = None
    current_stock: Optional[int] = None

class MaterialResponse(MaterialBase):
    id: int
    current_stock: int
    location: Optional[LocationResponse] = None
    
    class Config:
        from_attributes = True

# Movement Schemas
class MovementType(str, Enum):
    IN = "IN"
    OUT = "OUT"
    RETURN = "RETURN"
    ADJUSTMENT_POS = "ADJUSTMENT_POS"
    ADJUSTMENT_NEG = "ADJUSTMENT_NEG"

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
