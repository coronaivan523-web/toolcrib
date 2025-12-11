from app.db.session import SessionLocal
from app.db import base
from app.models.user import User
from app.core.security import get_password_hash, verify_password

def reset_admin_password():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == "admin").first()
        
        if user:
            print(f"Found user: {user.username}")
            
            # Test if admin123 already works
            if verify_password("admin123", user.hashed_password):
                print("Password 'admin123' is already correct!")
                return
            
            print("Resetting password to 'admin123'...")
            user.hashed_password = get_password_hash("admin123")
            db.commit()
            
            db.refresh(user)
            if verify_password("admin123", user.hashed_password):
                print("Password successfully reset to 'admin123'!")
            else:
                print("Password reset FAILED")
        else:
            print("Admin user not found!")
            
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    reset_admin_password()
