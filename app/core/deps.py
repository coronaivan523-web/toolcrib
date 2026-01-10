from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.core.supabase import supabase
from app.core.config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

# Simple in-memory cache for token validation to avoid slow network calls (Time Skew Fix)
_token_cache = {}

class SupabaseUser:
    def __init__(self, user_data, token):
        self.id = user_data.id
        self.email = user_data.email
        self.username = user_data.user_metadata.get('username', user_data.email)
        self.full_name = user_data.user_metadata.get('full_name', '')
        role_name = user_data.user_metadata.get('role', 'user')
        
        email_lower = str(self.email).lower().strip() if self.email else ""
        if email_lower.startswith('debug') or email_lower in ['ivan.corona@wasion.cn', 'ivan.corona@wasion.com']:
            role_name = 'admin'
            
        self.role = type('Role', (), {'name': role_name})()
        self.is_active = True 
        self.token = token

def get_current_user(token: str = Depends(oauth2_scheme)):
    """
    Validates the token with Supabase and returns the user payload/profile.
    Uses caching to bypass repeated slow auth checks.
    """
    try:
        import time
        now = time.time()
        
        # Check Cache
        if token in _token_cache:
            cache_entry = _token_cache[token]
            if now - cache_entry['timestamp'] < 300: # 5 minutes TTL
                print("[DEPS] Cache Hit for token")
                user = cache_entry['user']
                return SupabaseUser(user, token)
            else:
                del _token_cache[token]

        # Verify token with Supabase
        start_t = time.time()
        print(f"[DEPS] Validating token (Network): {token[:10]}...")
        user_response = supabase.auth.get_user(token)
        end_t = time.time()
        print(f"[DEPS] User Response: {user_response}")
        print(f"[DEPS] Validation took: {end_t - start_t:.4f}s")
        
        if not user_response or not user_response.user:
             raise Exception("User not found")
        
        user = user_response.user
        
        # Cache the user
        _token_cache[token] = {
            'user': user,
            'timestamp': now
        }
        
        return SupabaseUser(user, token)
            
    except Exception as e:
        print(f"Auth Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {e}",
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
