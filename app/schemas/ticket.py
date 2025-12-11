from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from enum import Enum

class TicketStatus(str, Enum):
    CREATED = "CREATED"
    APPROVED = "APPROVED"
    PREPARING = "PREPARING"
    READY_FOR_PICKUP = "READY_FOR_PICKUP"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"

# Ticket Item Schemas
class TicketItemBase(BaseModel):
    material_id: int
    quantity_requested: int

class TicketItemCreate(TicketItemBase):
    pass

class TicketItemResponse(TicketItemBase):
    id: int
    ticket_id: int
    quantity_fulfilled: int
    
    class Config:
        from_attributes = True

# Ticket Schemas
class TicketBase(BaseModel):
    pass

class TicketCreate(TicketBase):
    items: List[TicketItemCreate]

class TicketUpdate(TicketBase):
    status: Optional[TicketStatus] = None
    assigned_to: Optional[int] = None

class TicketResponse(TicketBase):
    id: int
    requester_id: int
    assigned_to: Optional[int] = None
    status: TicketStatus
    created_at: datetime
    updated_at: datetime
    items: List[TicketItemResponse]
    
    class Config:
        from_attributes = True
