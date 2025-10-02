from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator

# Address schemas for new workflow structure
class AddressCreate(BaseModel):
    name: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    notes: Optional[str] = None
    # Google Places integration fields
    formatted_address: Optional[str] = None
    google_place_id: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class AddressUpdate(BaseModel):
    name: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    notes: Optional[str] = None
    # Google Places integration fields
    formatted_address: Optional[str] = None
    google_place_id: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class AddressResponse(BaseModel):
    id: int
    name: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    notes: Optional[str] = None
    # Google Places integration fields
    formatted_address: Optional[str] = None
    google_place_id: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Project schemas for new workflow structure
class ProjectCreate(BaseModel):
    company_id: int
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    status: str = Field(default="open", pattern="^(open|closed|reopened)$")
    current_start_date: Optional[date] = None
    current_end_date: Optional[date] = None

class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(open|closed|reopened)$")
    current_start_date: Optional[date] = None
    current_end_date: Optional[date] = None

class ProjectResponse(BaseModel):
    id: int
    company_id: int
    company_name: Optional[str] = None
    name: str
    description: Optional[str] = None
    status: str
    current_start_date: Optional[date] = None
    current_end_date: Optional[date] = None
    created_at: datetime
    updated_at: datetime

    @field_validator('created_at', 'updated_at', mode='before')
    @classmethod
    def validate_datetime(cls, v):
        if isinstance(v, str):
            return datetime.fromisoformat(v.replace('Z', '+00:00'))
        return v

    class Config:
        from_attributes = True

# Project visit schemas
class ProjectVisitCreate(BaseModel):
    project_id: int
    address_id: int
    visit_date: date
    technician_id: int
    notes: Optional[str] = None

class ProjectVisitUpdate(BaseModel):
    visit_date: Optional[date] = None
    technician_id: Optional[int] = None
    notes: Optional[str] = None

class ProjectVisitResponse(BaseModel):
    id: int
    project_id: int
    address_id: int
    visit_date: date
    technician_id: int
    notes: Optional[str] = None
    address_name: Optional[str] = None
    address_line1: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    technician_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Legacy support (keeping for backward compatibility during transition)
class AddressBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    date: date

class AddressInDB(AddressBase):
    id: int
    sample_ids: List[int] = Field(default_factory=list)
    created_at: date

    @field_validator('created_at', mode='before')
    @classmethod
    def validate_created_at(cls, v):
        if isinstance(v, datetime):
            return v.date()
        return v

    class Config:
        from_attributes = True

class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)

class ProjectInDB(ProjectBase):
    id: int
    address_ids: List[int] = Field(default_factory=list)
    created_at: date

    @field_validator('created_at', mode='before')
    @classmethod
    def validate_created_at(cls, v):
        if isinstance(v, datetime):
            return v.date()
        return v

    class Config:
        from_attributes = True

class ProjectWithAddresses(ProjectInDB):
    addresses: List[AddressInDB] = Field(default_factory=list)

class ProjectTechnicianAssign(BaseModel):
    user_id: int

class ProjectTechnicianRemove(BaseModel):
    user_id: int
