from sqlalchemy import Boolean, Column, Integer, String, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.db.base_class import Base

class Role(Base):
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    permissions = Column(JSON)
    
    users = relationship("User", back_populates="role")

class User(Base):
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    employee_number = Column(String)
    is_active = Column(Boolean(), default=True)
    role_id = Column(Integer, ForeignKey("role.id"))
    
    role = relationship("Role", back_populates="users")
    movements = relationship("InventoryMovement", back_populates="user")
    tickets_requested = relationship("Ticket", foreign_keys="Ticket.requester_id", back_populates="requester")
    tickets_assigned = relationship("Ticket", foreign_keys="Ticket.assigned_to", back_populates="assignee")
    cycle_counts = relationship("CycleCount", back_populates="auditor")
