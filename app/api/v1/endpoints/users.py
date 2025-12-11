from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_active_user, get_current_active_superuser
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.core.security import get_password_hash

router = APIRouter()

@router.get("/", response_model=List[UserResponse])
def read_users(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_superuser),
) -> Any:
    """
    Retrieve users.
    """
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@router.post("/", response_model=UserResponse)
def create_user(
    *,
    db: Session = Depends(get_db),
    user_in: UserCreate,
    current_user: User = Depends(get_current_active_superuser),
) -> Any:
    """
    Create new user.
    """
    # Check for existing user by email or username
    user = db.query(User).filter(
        (User.email == user_in.email) | (User.username == user_in.username)
    ).first()
    
    if user:
        if user.is_active:
            raise HTTPException(
                status_code=400,
                detail="The user with this email or username already exists.",
            )
        else:
            # Reactivate user and update details
            user.is_active = True
            user.username = user_in.username
            user.email = user_in.email
            user.full_name = user_in.full_name
            user.hashed_password = get_password_hash(user_in.password)
            user.employee_number = user_in.employee_number
            user.role_id = user_in.role_id
            
            db.add(user)
            db.commit()
            db.refresh(user)
            return user

    user = User(
        email=user_in.email,
        username=user_in.username,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        employee_number=user_in.employee_number,
        role_id=user_in.role_id,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.get("/{user_id}", response_model=UserResponse)
def read_user_by_id(
    user_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Get a specific user by id.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="The user with this id does not exist in the system",
        )
    if user == current_user:
        return user
    if not current_user.role or current_user.role.name != "Admin": # Assuming Admin role check
         raise HTTPException(
            status_code=400, detail="The user doesn't have enough privileges"
        )
    return user

@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    *,
    db: Session = Depends(get_db),
    user_id: int,
    user_in: UserUpdate,
    current_user: User = Depends(get_current_active_superuser),
) -> Any:
    """
    Update a user.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="The user with this id does not exist in the system",
        )
    
    update_data = user_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
        
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.delete("/{user_id}", response_model=UserResponse)
def delete_user(
    *,
    db: Session = Depends(get_db),
    user_id: int,
    current_user: User = Depends(get_current_active_superuser),
) -> Any:
    """
    Two-stage user deletion:
    1. If active: deactivate (soft delete)
    2. If inactive: permanently delete (hard delete, may fail if user has history)
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="The user with this id does not exist in the system",
        )
    
    if user.is_active:
        # Stage 1: Deactivate
        user.is_active = False
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    else:
        # Stage 2: Permanent deletion
        try:
            db.delete(user)
            db.commit()
            return user
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=400,
                detail="Cannot delete user with existing history (tickets, movements, etc.). User remains inactive.",
            )
