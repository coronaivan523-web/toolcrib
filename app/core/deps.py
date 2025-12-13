from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.core.supabase import supabase
from app.core.config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

# get_db is removed as we use Supabase client directly

def get_current_user(token: str = Depends(oauth2_scheme)):
    """
    Validates the token with Supabase and returns the user payload/profile.
    """
    try:
        # Verify token with Supabase
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
             raise Exception("User not found")
        
        user = user_response.user
        
        # Optionally fetch profile from 'profiles' table if needed
        # profile = supabase.table('profiles').select('*').eq('id', user.id).single().execute()
        
        # Construct a user object compatible with existing code or just return the dict
        # For compatibility with existing models, we might need a wrapper, 
        # but for now let's return a simple object or dict that mimics what we need.
        # We'll attach the token to the user object if we need it for RLS calls downstream.
        
        # Quick wrapper for compatibility
        class SupabaseUser:
            def __init__(self, user_data, token):
                self.id = user_data.id
                self.email = user_data.email
                self.username = user_data.user_metadata.get('username', user_data.email)
                self.full_name = user_data.user_metadata.get('full_name', '')
                self.role = type('Role', (), {'name': user_data.user_metadata.get('role', 'user')})()
                self.is_active = True # Supabase users are active if they can login
                self.token = token # Keep token for RLS
                
        return SupabaseUser(user, token)

    except Exception as e:
        print(f"Auth Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_current_active_user(current_user = Depends(get_current_user)):
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def get_current_active_superuser(current_user = Depends(get_current_user)):
    # Check role from metadata/profile
    if current_user.role.name != "admin": # Adjust role name as needed
         raise HTTPException(
            status_code=400, detail="The user doesn't have enough privileges"
        )
    return current_user
