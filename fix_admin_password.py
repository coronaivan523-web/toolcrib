from app.core.security import get_password_hash, verify_password
from app.db.session import SessionLocal
from app.db import base  # Import base first to load all models
from app.models.user import User

db = SessionLocal()

try:
    # Find admin user
    user = db.query(User).filter(User.username == 'admin').first()
    
    if user:
        print(f"User found: {user.username}")
        print(f"Email: {user.email}")
        print(f"Active: {user.is_active}")
        print(f"Role ID: {user.role_id}")
        
        # Test passwords
        print(f"\nTesting passwords:")
        print(f"  'admin' works: {verify_password('admin', user.hashed_password)}")
        print(f"  'admin123' works: {verify_password('admin123', user.hashed_password)}")
        
        # Update password to 'admin' if needed
        if not verify_password('admin', user.hashed_password):
            print(f"\nUpdating password to 'admin'...")
            user.hashed_password = get_password_hash('admin')
            db.commit()
            print("Password updated successfully!")
            
            # Verify again
            db.refresh(user)
            print(f"Verification after update: {verify_password('admin', user.hashed_password)}")
        else:
            print("\nPassword 'admin' already works!")
    else:
        print("No admin user found!")
        
except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
