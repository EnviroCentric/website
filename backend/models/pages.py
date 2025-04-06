from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class PageBase(BaseModel):
    name: str
    path: str
    description: Optional[str] = None


class PageCreate(PageBase):
    pass


class Page(PageBase):
    page_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PageRole(BaseModel):
    page_id: int
    role_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class PageWithRoles(Page):
    roles: List[int]
    min_security_level: Optional[int] = None

    class Config:
        from_attributes = True


class PageRolesUpdate(BaseModel):
    role_ids: List[int]
    min_security_level: Optional[int] = None
