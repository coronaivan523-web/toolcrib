
from typing import Optional, List
from uuid import UUID
from datetime import date, datetime
from pydantic import BaseModel

# --- Material Schema for Responses (Strict) ---
class MaterialResponse(BaseModel):
    id: int
    name: str
    part_number: str
    current_stock: int
    sku: Optional[str] = None
    category: Optional[str] = None
    unit_of_measure: Optional[str] = None

# --- Session Schemas ---
class CycleCountSessionCreate(BaseModel):
    admin_notes: Optional[str] = None
    planned_date: Optional[str] = None # ISO Format YYYY-MM-DD
    assigned_to: Optional[UUID] = None

class CycleCountSessionUpdate(BaseModel):
    status: Optional[str] = None
    admin_notes: Optional[str] = None

# --- Line Schemas ---
class CycleCountLineCreate(BaseModel):
    material_id: int
    qty_physical: int
    location_id: Optional[UUID] = None
    notes: Optional[str] = None
    count_date: Optional[str] = None # ISO Format
    planned_date: Optional[str] = None # ISO Format

class CycleCountLineResponse(BaseModel):
    id: UUID
    session_id: UUID
    material: dict # Relaxed validation
    qty_system: int
    qty_physical: int
    diff: int # Calculated field
    notes: Optional[str] = None
    planned_date: Optional[str] = None
    counted_by: Optional[UUID] = None
    
    class Config:
        arbitrary_types_allowed = True
