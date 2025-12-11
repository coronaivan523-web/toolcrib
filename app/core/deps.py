from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.core.security import decode_access_token
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def get_db() -> Generator:
    """Dependency para obtener sesión de base de datos"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> User:
    """Obtener usuario actual desde el token JWT"""
    print(f"DEBUG: Received token: {token[:50]}..." if len(token) > 50 else f"DEBUG: Received token: {token}")
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = decode_access_token(token)
    print(f"DEBUG: Decoded payload: {payload}")
    
    if payload is None:
        print("DEBUG: Payload is None - token decode failed")
        raise credentials_exception
    
    user_id: int = payload.get("sub")
    print(f"DEBUG: User ID from token: {user_id}")
    
    if user_id is None:
        print("DEBUG: user_id is None")
        raise credentials_exception
    
    user = db.query(User).filter(User.id == user_id).first()
    print(f"DEBUG: User found: {user}")
    
    if user is None:
        print("DEBUG: User not found in database")
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    return user

def require_role(required_role: str):
    """Dependency factory para validar roles específicos"""
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role.name != required_role and current_user.role.name != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{required_role}' required"
            )
        return current_user
    return role_checker

def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def get_current_active_superuser(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.role or current_user.role.name != "Admin":
        raise HTTPException(
            status_code=400, detail="The user doesn't have enough privileges"
        )
    return current_user
