from pydantic import BaseModel
from typing import Optional

class MaterialBase(BaseModel):
    sku: str
    name: str
    description: Optional[str] = None
    category: str
    unit_of_measure: str
    min_stock: int = 0
    max_stock: int = 0
    location_id: Optional[int] = None
    image_url: Optional[str] = None

class MaterialCreate(MaterialBase):
    pass

class MaterialUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    unit_of_measure: Optional[str] = None
    min_stock: Optional[int] = None
    max_stock: Optional[int] = None
    location_id: Optional[int] = None
    image_url: Optional[str] = None

class MaterialResponse(MaterialBase):
    id: int
    current_stock: int
    location_code: Optional[str] = None
    
    class Config:
        from_attributes = True
