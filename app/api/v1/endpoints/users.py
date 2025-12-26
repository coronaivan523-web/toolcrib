from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.deps import get_current_user, get_current_active_superuser
from app.core.supabase import supabase, supabase_admin
from app.schemas.user import UserCreate, UserUpdate, UserResponse

router = APIRouter()

@router.get("/", response_model=List[UserResponse])
def read_users(
    skip: int = 0,
    limit: int = 100,
    current_user = Depends(get_current_user),
) -> Any:
    """
    Retrieve users (profiles).
    """
    try:
        res = supabase.table('profiles').select('*').range(skip, skip + limit - 1).execute()
        
        # Map profiles to UserResponse
        users = []
        for p in res.data:
            users.append(UserResponse(
                id=p['id'],
                username=p.get('username'),
                email=p.get('email'),
                full_name=p.get('full_name'),
                employee_number=p.get('employee_number'),
                is_active=p.get('is_active', True),
                role_name=p.get('role', 'user'),
                role_id=0
            ))
        return users
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/", response_model=UserResponse)
def create_user(
    *,
    user_in: UserCreate,
    current_user = Depends(get_current_active_superuser),
) -> Any:
    """
    Create new user.
    Requires SUPABASE_SERVICE_KEY to create auth user via Admin API.
    """
    if not supabase_admin:
        raise HTTPException(status_code=501, detail="Service Role Key not configured for Admin actions")

    try:
        # 1. Create Auth User
        auth_res = supabase_admin.auth.admin.create_user({
            "email": user_in.email,
            "password": user_in.password,
            "email_confirm": True,
            "user_metadata": {
                "username": user_in.username,
                "full_name": user_in.full_name,
                "role": user_in.role_name
            }
        })
        
        user_data = auth_res.user
        
        # 2. Profile should be created automatically by Trigger (if SQL trigger exists)
        # But if we want to ensure or update specific fields:
        
        # We can wait or manually insert if trigger failed or not present?
        # Let's rely on Trigger or just return what we have.
        
        # If the SQL trigger I provided is used, profile is created with metadata.
        # But let's check or update `employee_number` which might not be in metadata.
        
        supabase_admin.table('profiles').update({
            "employee_number": user_in.employee_number,
            "role": user_in.role_name
        }).eq('id', user_data.id).execute()

        return UserResponse(
            id=user_data.id,
            username=user_in.username,
            email=user_in.email,
            full_name=user_in.full_name,
            employee_number=user_in.employee_number,
            is_active=True,
            role_name=user_in.role_name,
            role_id=0
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create user: {str(e)}")


@router.get("/{user_id}", response_model=UserResponse)
def read_user_by_id(
    user_id: str,
    current_user = Depends(get_current_user),
) -> Any:
    """
    Get a specific user by id.
    """
    # Simply fetch from profiles
    res = supabase.table('profiles').select('*').eq('id', user_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")
        
    p = res.data
    return UserResponse(
        id=p['id'],
        username=p.get('username'),
        email=p.get('email'),
        full_name=p.get('full_name'),
        employee_number=p.get('employee_number'),
        is_active=p.get('is_active', True),
        role_name=p.get('role', 'user'),
        role_id=0
    )

@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    *,
    user_id: str,
    user_in: UserUpdate,
    current_user = Depends(get_current_active_superuser),
) -> Any:
    """
    Update a user.
    """
    updates = user_in.dict(exclude_unset=True)
    if not updates:
        # Just return current
        return read_user_by_id(user_id, current_user)

    try:
        # Update profile
        res = supabase.table('profiles').update(updates).eq('id', user_id).execute()
        
        if not res.data:
             raise HTTPException(status_code=404, detail="User not found")
             
        p = res.data[0]
        return UserResponse(
            id=p['id'],
            username=p.get('username'),
            email=p.get('email'),
            full_name=p.get('full_name'),
            employee_number=p.get('employee_number'),
            is_active=p.get('is_active', True),
            role_name=p.get('role', 'user'),
            role_id=0
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{user_id}", response_model=UserResponse)
def delete_user(
    *,
    user_id: str,
    current_user = Depends(get_current_active_superuser),
) -> Any:
    """
    Delete user (Hard delete from Auth).
    """
    if not supabase_admin:
        raise HTTPException(status_code=501, detail="Service Role Key required")

    try:
        # Get user first to return it
        p = supabase.table('profiles').select('*').eq('id', user_id).single().execute().data
        if not p:
            raise HTTPException(status_code=404, detail="User not found")
            
        # Delete from Auth (cascades to Profile usually)
        supabase_admin.auth.admin.delete_user(user_id)
        
        return UserResponse(
            id=p['id'],
            username=p.get('username'),
            email=p.get('email'),
            full_name=p.get('full_name'),
            employee_number=p.get('employee_number'),
            is_active=False,
            role_name=p.get('role', 'user'),
            role_id=0
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
