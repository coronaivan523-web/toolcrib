from pydantic import BaseModel, EmailStr
from typing import Optional

# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: Optional[int] = None

# User schemas
class UserBase(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    employee_number: Optional[str] = None

class UserCreate(UserBase):
    password: str
    role_id: int

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    role_id: int
    role_name: Optional[str] = None
    
    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    employee_number: Optional[str] = None
    is_active: Optional[bool] = None
    role_id: Optional[int] = None
