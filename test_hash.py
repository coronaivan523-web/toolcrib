from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

try:
    hash = pwd_context.hash("admin")
    print(f"Hash: {hash}")
except Exception as e:
    print(f"Error: {e}")
