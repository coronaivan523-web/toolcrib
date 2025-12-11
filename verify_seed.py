from app.db.session import SessionLocal
from app.models.user import User, Role
from app.models.inventory import InventoryMovement, Material, Location
from app.models.ticket import Ticket, TicketItem
from app.models.audit import CycleCount
from app.core.security import verify_password

def verify_seed():
    db = SessionLocal()
    try:
        # Check Roles
        roles = db.query(Role).all()
        print(f"Roles found: {[r.name for r in roles]}")
        
        # Check Admin User
        admin = db.query(User).filter(User.email == "admin@toolcrib.com").first()
        if admin:
            print(f"Admin user found: {admin.username}")
            if verify_password("admin", admin.hashed_password):
                print("Admin password verified.")
            else:
                print("Admin password verification FAILED.")
        else:
            print("Admin user NOT found.")
            
    finally:
        db.close()

if __name__ == "__main__":
    verify_seed()
