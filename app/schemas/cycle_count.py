from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel
from uuid import UUID
from app.schemas.material import MaterialResponse

# --- Lines ---
class CycleCountLineBase(BaseModel):
    material_id: int
    location_id: int
    qty_physical: float
    reason_code: Optional[str] = None
    evidence_urls: Optional[dict] = None # JSONB

class CycleCountLineCreate(CycleCountLineBase):
    pass

class CycleCountLineUpdate(BaseModel):
    qty_physical: Optional[float] = None
    reason_code: Optional[str] = None
    evidence_urls: Optional[dict] = None

class CycleCountLineResponse(CycleCountLineBase):
    id: UUID
    session_id: UUID
    qty_system: float
    variance: float
    counted_by: UUID
    counted_at: datetime
    
    # Relationships
    material: Optional[MaterialResponse] = None
    # We might need location details, but for now ID is enough or we fetch separately
    location_name: Optional[str] = None 
    material_name: Optional[str] = None
    material_part_number: Optional[str] = None

    class Config:
        from_attributes = True

# --- Sessions ---
class CycleCountSessionBase(BaseModel):
    count_date: date
    notes: Optional[str] = None
    location_scope: Optional[str] = None

class CycleCountSessionCreate(CycleCountSessionBase):
    pass # status defaults to DRAFT

class CycleCountSessionUpdate(BaseModel):
    notes: Optional[str] = None
    location_scope: Optional[str] = None
    status: Optional[str] = None

class CycleCountSessionResponse(CycleCountSessionBase):
    id: UUID
    created_at: datetime
    created_by: UUID
    status: str
    approved_by: Optional[UUID] = None
    approved_at: Optional[datetime] = None
    
    # Included details
    created_by_name: Optional[str] = None
    lines: Optional[List[CycleCountLineResponse]] = None

    class Config:
        from_attributes = True

# --- Adjustments ---
class InventoryAdjustmentResponse(BaseModel):
    id: UUID
    created_at: datetime
    material_id: int
    qty_before: float
    qty_after: float
    delta: float
    reason_code: Optional[str] = None
    
    class Config:
        from_attributes = True
