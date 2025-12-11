from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from app.db.base_class import Base
import enum
from datetime import datetime

class MovementType(str, enum.Enum):
    IN = "IN"
    OUT = "OUT"
    RETURN = "RETURN"
    ADJUSTMENT_POS = "ADJUSTMENT_POS"
    ADJUSTMENT_NEG = "ADJUSTMENT_NEG"

class Location(Base):
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True)
    description = Column(String)
    
    materials = relationship("Material", back_populates="location")

class Material(Base):
    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String, unique=True, index=True)
    name = Column(String, index=True)
    description = Column(Text)
    category = Column(String, index=True)
    unit_of_measure = Column(String)
    min_stock = Column(Integer, default=0)
    max_stock = Column(Integer, default=0)
    current_stock = Column(Integer, default=0)
    location_id = Column(Integer, ForeignKey("location.id"))
    image_url = Column(String, nullable=True)
    
    location = relationship("Location", back_populates="materials")
    movements = relationship("InventoryMovement", back_populates="material")
    ticket_items = relationship("TicketItem", back_populates="material")
    cycle_count_items = relationship("CycleCountItem", back_populates="material")

class InventoryMovement(Base):
    id = Column(Integer, primary_key=True, index=True)
    material_id = Column(Integer, ForeignKey("material.id"))
    movement_type = Column(Enum(MovementType))
    quantity = Column(Integer)
    user_id = Column(Integer, ForeignKey("user.id"))
    timestamp = Column(DateTime, default=datetime.utcnow)
    reference_type = Column(String) # TICKET, PO, CYCLE_COUNT
    reference_id = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    
    material = relationship("Material", back_populates="movements")
    user = relationship("User", back_populates="movements")
