from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from app.db.base_class import Base
import enum
from datetime import datetime

class TicketStatus(str, enum.Enum):
    CREATED = "CREATED"
    APPROVED = "APPROVED"
    PREPARING = "PREPARING"
    READY_FOR_PICKUP = "READY_FOR_PICKUP"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"

class Ticket(Base):
    id = Column(Integer, primary_key=True, index=True)
    requester_id = Column(Integer, ForeignKey("user.id"))
    assigned_to = Column(Integer, ForeignKey("user.id"), nullable=True)
    status = Column(Enum(TicketStatus), default=TicketStatus.CREATED)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    requester = relationship("User", foreign_keys=[requester_id], back_populates="tickets_requested")
    assignee = relationship("User", foreign_keys=[assigned_to], back_populates="tickets_assigned")
    items = relationship("TicketItem", back_populates="ticket")

class TicketItem(Base):
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("ticket.id"))
    material_id = Column(Integer, ForeignKey("material.id"))
    quantity_requested = Column(Integer)
    quantity_fulfilled = Column(Integer, default=0)
    
    ticket = relationship("Ticket", back_populates="items")
    material = relationship("Material", back_populates="ticket_items")
