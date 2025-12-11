from app.db.session import SessionLocal
from app.models.user import User, Role
from app.models.inventory import InventoryMovement
from app.models.ticket import Ticket
from app.models.audit import CycleCount

def check_users():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        print(f"Found {len(users)} users:")
        for user in users:
            print(f"  - ID: {user.id}, Username: {user.username}, Email: {user.email}, Active: {user.is_active}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_users()
