from typing import Optional, List, Dict
from datetime import date
from asyncpg import Pool
from app.db.queries.manager import query_manager
from app.schemas.project import (
    ProjectCreate, ProjectUpdate, ProjectResponse,
    ProjectVisitCreate, ProjectVisitUpdate, ProjectVisitResponse,
    AddressCreate, AddressUpdate, AddressResponse
)


class ProjectService:
    def __init__(self, pool: Pool):
        self.pool = pool

    async def create_project(self, project_in: ProjectCreate) -> ProjectResponse:
        """Create a new environmental project."""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                query_manager.create_project,
                project_in.company_id,
                project_in.name,
                project_in.description,
                project_in.status,
                project_in.current_start_date,
                project_in.current_end_date
            )
            return ProjectResponse(**dict(row))

    async def get_project_by_id(self, project_id: int) -> Optional[ProjectResponse]:
        """Get a project by ID."""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                query_manager.get_project,
                project_id
            )
            return ProjectResponse(**dict(row)) if row else None

    async def update_project(self, project_id: int, project_in: ProjectUpdate) -> Optional[ProjectResponse]:
        """Update a project."""
        async with self.pool.acquire() as conn:
            update_data = project_in.model_dump(exclude_unset=True)
            
            row = await conn.fetchrow(
                query_manager.update_project,
                project_id,
                update_data.get('name'),
                update_data.get('description'),
                update_data.get('status'),
                update_data.get('current_start_date'),
                update_data.get('current_end_date')
            )
            return ProjectResponse(**dict(row)) if row else None

    async def delete_project(self, project_id: int) -> bool:
        """Delete a project."""
        async with self.pool.acquire() as conn:
            result = await conn.execute(
                query_manager.delete_project,
                project_id
            )
            return result == "DELETE 1"

    async def list_projects(self) -> List[ProjectResponse]:
        """List all projects."""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(query_manager.list_projects)
            return [ProjectResponse(**dict(row)) for row in rows]

    async def list_projects_by_company(self, company_id: int) -> List[ProjectResponse]:
        """List projects for a specific company."""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                query_manager.list_projects_by_company,
                company_id
            )
            return [ProjectResponse(**dict(row)) for row in rows]

    async def list_technician_projects(self, technician_id: int) -> List[Dict]:
        """List projects assigned to a technician."""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                query_manager.list_technician_projects,
                technician_id
            )
            return [dict(row) for row in rows]

    # Address management
    async def create_address(self, address_in: AddressCreate) -> Dict:
        """Create a new address."""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                query_manager.create_address,
                address_in.name,
                address_in.address_line1,
                address_in.address_line2,
                address_in.city,
                address_in.state,
                address_in.zip,
                address_in.notes
            )
            return dict(row)

    async def get_address(self, address_id: int) -> Optional[Dict]:
        """Get an address by ID."""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                query_manager.get_address,
                address_id
            )
            return dict(row) if row else None

    async def update_address(self, address_id: int, address_in: AddressUpdate) -> Optional[Dict]:
        """Update an address."""
        async with self.pool.acquire() as conn:
            update_data = address_in.model_dump(exclude_unset=True)
            
            row = await conn.fetchrow(
                query_manager.update_address,
                address_id,
                update_data.get('name'),
                update_data.get('address_line1'),
                update_data.get('address_line2'),
                update_data.get('city'),
                update_data.get('state'),
                update_data.get('zip'),
                update_data.get('notes')
            )
            return dict(row) if row else None

    async def delete_address(self, address_id: int) -> bool:
        """Delete an address."""
        async with self.pool.acquire() as conn:
            result = await conn.execute(
                query_manager.delete_address,
                address_id
            )
            return result == "DELETE 1"

    # Project visits management
    async def create_project_visit(self, visit_in: ProjectVisitCreate) -> Dict:
        """Create a project visit."""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                query_manager.create_project_visit,
                visit_in.project_id,
                visit_in.address_id,
                visit_in.visit_date,
                visit_in.technician_id,
                visit_in.notes
            )
            return dict(row)

    async def update_project_visit(self, visit_id: int, visit_in: ProjectVisitUpdate) -> Optional[Dict]:
        """Update a project visit."""
        async with self.pool.acquire() as conn:
            update_data = visit_in.model_dump(exclude_unset=True)
            
            row = await conn.fetchrow(
                query_manager.update_project_visit,
                visit_id,
                update_data.get('visit_date'),
                update_data.get('technician_id'),
                update_data.get('notes')
            )
            return dict(row) if row else None

    async def delete_project_visit(self, visit_id: int) -> bool:
        """Delete a project visit."""
        async with self.pool.acquire() as conn:
            result = await conn.execute(
                query_manager.delete_project_visit,
                visit_id
            )
            return result == "DELETE 1"

    async def get_project_visits(self, project_id: int) -> List[Dict]:
        """Get all visits for a project."""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                query_manager.get_project_visits,
                project_id
            )
            return [dict(row) for row in rows]

    async def get_project_visits_by_date(self, project_id: int, visit_date: date) -> List[Dict]:
        """Get visits for a project on a specific date."""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                query_manager.get_project_visits_by_date,
                project_id,
                visit_date
            )
            return [dict(row) for row in rows]

    async def get_project_addresses(self, project_id: int) -> List[Dict]:
        """Get all addresses associated with a project."""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                query_manager.get_project_addresses,
                project_id
            )
            return [dict(row) for row in rows]

    async def get_project_technicians(self, project_id: int) -> List[Dict]:
        """Get all technicians assigned to a project."""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                query_manager.get_project_technicians,
                project_id
            )
            return [dict(row) for row in rows]

    async def check_technician_assigned_to_project(self, project_id: int, technician_id: int) -> bool:
        """Check if a technician is assigned to a project."""
        async with self.pool.acquire() as conn:
            result = await conn.fetchval(
                query_manager.check_technician_assigned_to_project,
                project_id,
                technician_id
            )
            return bool(result)

    async def check_address_in_project(self, project_id: int, address_id: int) -> bool:
        """Check if an address is associated with a project."""
        async with self.pool.acquire() as conn:
            result = await conn.fetchval(
                query_manager.check_address_in_project,
                project_id,
                address_id
            )
            return bool(result)
    
