from pydantic import BaseModel, EmailStr
from typing import Optional

# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: Optional[str] = None # UUID

# User schemas
class UserBase(BaseModel):
    username: Optional[str] = None
    email: EmailStr
    full_name: Optional[str] = None
    employee_number: Optional[str] = None

class UserCreate(UserBase):
    password: str
    role_id: Optional[int] = 0 # Deprecated or used for role mapping
    role_name: Optional[str] = 'user'

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(UserBase):
    id: str # UUID
    is_active: bool
    role_id: Optional[int] = 0
    role_name: Optional[str] = None
    
    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    employee_number: Optional[str] = None
    is_active: Optional[bool] = None
    role_name: Optional[str] = None
