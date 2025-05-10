from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel, Field, field_validator

class SampleBase(BaseModel):
    address_id: int

class SampleCreate(SampleBase):
    pass

class SampleUpdate(BaseModel):
    description: Optional[str] = None
    is_inside: Optional[bool] = None
    flow_rate: Optional[int] = Field(None, ge=0)
    volume_required: Optional[int] = Field(None, ge=0)
    start_time: Optional[datetime] = None
    stop_time: Optional[datetime] = None
    fields: Optional[int] = Field(None, ge=0)
    fibers: Optional[int] = Field(None, ge=0)

    @field_validator('stop_time')
    def validate_stop_time(cls, v, values):
        if v and 'start_time' in values and values['start_time']:
            if v < values['start_time']:
                raise ValueError('stop_time must be after start_time')
        return v

class SampleInDB(SampleBase):
    id: int
    description: Optional[str] = None
    is_inside: Optional[bool] = None
    flow_rate: Optional[int] = None
    volume_required: Optional[int] = None
    start_time: Optional[datetime] = None
    stop_time: Optional[datetime] = None
    total_time_ran: Optional[timedelta] = None
    fields: Optional[int] = None
    fibers: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True 