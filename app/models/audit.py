from sqlalchemy import Column, Integer, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from app.db.base_class import Base
import enum
from datetime import datetime

class CycleCountStatus(str, enum.Enum):
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    REVIEW_PENDING = "REVIEW_PENDING"

class CycleCount(Base):
    __tablename__ = "cyclecount"
    
    id = Column(Integer, primary_key=True, index=True)
    auditor_id = Column(Integer, ForeignKey("user.id"))
    status = Column(Enum(CycleCountStatus), default=CycleCountStatus.IN_PROGRESS)
    created_at = Column(DateTime, default=datetime.utcnow)
    closed_at = Column(DateTime, nullable=True)
    
    auditor = relationship("User", back_populates="cycle_counts")
    items = relationship("CycleCountItem", back_populates="cycle_count")

class CycleCountItem(Base):
    __tablename__ = "cyclecountitem"
    
    id = Column(Integer, primary_key=True, index=True)
    cycle_count_id = Column(Integer, ForeignKey("cyclecount.id"))
    material_id = Column(Integer, ForeignKey("material.id"))
    system_stock_snapshot = Column(Integer)
    counted_stock = Column(Integer, nullable=True)
    difference = Column(Integer, nullable=True)
    
    cycle_count = relationship("CycleCount", back_populates="items")
    material = relationship("Material", back_populates="cycle_count_items")
