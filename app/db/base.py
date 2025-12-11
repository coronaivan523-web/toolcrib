# Import all models here to ensure SQLAlchemy can resolve relationships
from app.db.base_class import Base
from app.models.user import User, Role
from app.models.inventory import Material, Location, InventoryMovement
from app.models.ticket import Ticket, TicketItem
from app.models.audit import CycleCount, CycleCountItem
