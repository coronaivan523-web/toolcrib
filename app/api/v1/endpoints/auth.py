from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.core.deps import get_current_user
from app.core.supabase import supabase
from app.schemas.user import Token, UserResponse

router = APIRouter()

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Login using Supabase Auth.
    """
    try:
        # Supabase sign in
        res = supabase.auth.sign_in_with_password({
            "email": form_data.username, # Assuming username field receives email
            "password": form_data.password
        })
        
        if not res.session:
            raise Exception("Login failed")

        return {
            "access_token": res.session.access_token,
            "token_type": "bearer"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user = Depends(get_current_user)):
    """
    Get current user details.
    """
    # Fetch additional details from profiles if not present in current_user wrapper
    # For now, current_user from deps is a wrapper around Supabase user
    
    # If we need the real profile from DB:
    try:
        profile_res = supabase.table('profiles').select('*').eq('id', current_user.id).single().execute()
        if profile_res.data:
            data = profile_res.data
            return UserResponse(
                id=str(current_user.id), # UUID
                username=data.get('username') or current_user.username,
                email=current_user.email,
                full_name=data.get('full_name') or current_user.full_name,
                employee_number=data.get('employee_number'),
                is_active=current_user.is_active,
                role_name=data.get('role', 'user'),
                role_id=0 # Legacy field comp
            )
    except Exception:
        pass # Fallback to auth metadata

    return UserResponse(
        id=str(current_user.id),
        username=current_user.username,
        email=current_user.email,
        full_name=current_user.full_name,
        employee_number="",
        is_active=current_user.is_active,
        role_name=current_user.role.name,
        role_id=0
    )
