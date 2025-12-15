from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import datetime

class TicketItemBase(BaseModel):
    material_id: int
    quantity_requested: int

class TicketItemCreate(TicketItemBase):
    pass

class TicketItem(TicketItemBase):
    id: str # UUID
    ticket_id: str # UUID
    quantity_fulfilled: int = 0
    
    class Config:
        from_attributes = True

class TicketBase(BaseModel):
    status: Optional[str] = "PENDIENTE"

class TicketCreate(TicketBase):
    items: List[TicketItemCreate]

class TicketUpdate(TicketBase):
    status: Optional[str] = None
    assigned_to: Optional[str] = None # UUID

class TicketResponse(TicketBase):
    id: str # UUID
    requester_id: str # UUID
    assigned_to: Optional[str] = None # UUID
    created_at: datetime
    updated_at: datetime
    items: List[TicketItem] = []
    # requester: Optional[Any] = None # Include if we want nested requester info
    
    class Config:
        from_attributes = True
