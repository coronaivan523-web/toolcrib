from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.inventory import MovementType

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
