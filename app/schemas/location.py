from pydantic import BaseModel
from typing import Optional

class LocationBase(BaseModel):
    code: str
    description: Optional[str] = None

class LocationCreate(LocationBase):
    pass

class LocationUpdate(BaseModel):
    code: Optional[str] = None
    description: Optional[str] = None

class LocationResponse(LocationBase):
    id: int
    
    class Config:
        from_attributes = True
