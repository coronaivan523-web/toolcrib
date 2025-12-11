import sys
import os
from sqlalchemy import text

# Add the current directory to sys.path to make app module importable
sys.path.append(os.getcwd())

from app.db.session import SessionLocal

def test_connection():
    try:
        db = SessionLocal()
        # Try to execute a simple query
        db.execute(text("SELECT 1"))
        print("Database connection successful!")
        db.close()
    except Exception as e:
        print(f"Database connection failed: {repr(e)}")


if __name__ == "__main__":
    test_connection()
