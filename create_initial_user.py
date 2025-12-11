from app.db.session import SessionLocal
from app.models.user import User, Role
from app.models.inventory import InventoryMovement
from app.models.ticket import Ticket
from app.models.audit import CycleCount
from app.core.security import get_password_hash

def create_initial_user():
    db = SessionLocal()
    try:
        # Check/Create Role
        role = db.query(Role).filter(Role.name == "Admin").first()
        if not role:
            role = Role(name="Admin", permissions={})
            db.add(role)
            db.commit()
            db.refresh(role)
            print("Role 'Admin' created.")
        else:
            print("Role 'Admin' already exists.")

        # Check/Create User
        user = db.query(User).filter(User.email == "admin@example.com").first()
        if user:
            print("User admin@example.com already exists.")
            return

        user = User(
            email="admin@example.com",
            username="admin",
            hashed_password=get_password_hash("admin123"),
            full_name="Admin User",
            employee_number="001",
            is_active=True,
            role_id=role.id
        )
        db.add(user)
        db.commit()
        print("User admin@example.com created successfully.")
    except Exception as e:
        print(f"Error creating user: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_initial_user()
