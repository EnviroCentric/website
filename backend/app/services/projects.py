from datetime import date
from typing import List, Optional
from fastapi import HTTPException, status
from asyncpg.pool import Pool

from app.schemas.project import (
    ProjectCreate, ProjectUpdate, ProjectInDB, ProjectWithAddresses,
    AddressCreate, AddressUpdate, AddressInDB
)
from app.db.queries import projects as queries
from app.services.roles import get_user_role_level

async def create_project(
    db: Pool,
    project: ProjectCreate,
    current_user_id: int
) -> ProjectInDB:
    # Check if user has technician role or higher
    role_level = await get_user_role_level(db, current_user_id)
    if role_level < 50:  # Technician level
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only technicians and higher roles can create projects"
        )
    
    result = await db.fetchrow(queries.create_project, project.name)
    return ProjectInDB(**result)

async def get_project(
    db: Pool,
    project_id: int,
    current_user_id: int
) -> ProjectWithAddresses:
    # First check if project exists
    project = await db.fetchrow(queries.get_project, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Then check if user has access to the project
    is_assigned = await db.fetchval(
        queries.check_technician_assigned,
        project_id, current_user_id
    )
    role_level = await get_user_role_level(db, current_user_id)
    
    # Only allow access if user is assigned to project or has supervisor role or higher
    if not is_assigned and role_level < 80:  # Supervisor level
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this project"
        )
    
    # Get addresses
    addresses = await db.fetch(
        queries.get_project_addresses,
        project_id
    )
    addresses = [AddressInDB(**addr) for addr in addresses]
    
    return ProjectWithAddresses(**project, addresses=addresses)

async def update_project(
    db: Pool,
    project_id: int,
    project_update: ProjectUpdate,
    current_user_id: int
) -> ProjectInDB:
    # Check if user has access to the project
    is_assigned = await db.fetchval(
        queries.check_technician_assigned,
        project_id, current_user_id
    )
    role_level = await get_user_role_level(db, current_user_id)
    
    if not is_assigned and role_level < 50:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this project"
        )
    
    updated_project = await db.fetchrow(
        queries.update_project,
        project_id, project_update.name
    )
    if not updated_project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    return ProjectInDB(**updated_project)

async def create_address(
    db: Pool,
    project_id: int,
    address: AddressCreate,
    current_user_id: int
) -> AddressInDB:
    # Check if user has access to the project
    is_assigned = await db.fetchval(
        queries.check_technician_assigned,
        project_id, current_user_id
    )
    role_level = await get_user_role_level(db, current_user_id)
    
    if not is_assigned and role_level < 50:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this project"
        )
    
    try:
        new_address = await db.fetchrow(
            queries.create_address,
            address.name, address.date
        )
        
        # Add address to project
        await db.execute(
            queries.add_address_to_project,
            project_id, new_address["id"]
        )
        
        return AddressInDB(**new_address)
    except Exception as e:
        if "unique_address_per_day" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An address with this name already exists for this date"
            )
        raise

async def update_address(
    db: Pool,
    project_id: int,
    address_id: int,
    address_update: AddressUpdate,
    current_user_id: int
) -> AddressInDB:
    # Check if user has access to the project
    is_assigned = await db.fetchval(
        queries.check_technician_assigned,
        project_id, current_user_id
    )
    role_level = await get_user_role_level(db, current_user_id)
    
    if not is_assigned and role_level < 50:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this project"
        )
    
    try:
        # Get current address to preserve the date
        current_address = await db.fetchrow(
            queries.get_address,
            address_id
        )
        if not current_address:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Address not found"
            )
        
        # Update only the name, keeping the original date
        updated_address = await db.fetchrow(
            queries.update_address,
            address_id, address_update.name, current_address["date"]
        )
        if not updated_address:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Address not found"
            )
        
        return AddressInDB(**updated_address)
    except Exception as e:
        if "unique_address_per_day" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An address with this name already exists for this date"
            )
        raise

async def assign_technician(
    db: Pool,
    project_id: int,
    user_id: int,
    current_user_id: int
) -> None:
    # Check if current user has supervisor role or higher
    role_level = await get_user_role_level(db, current_user_id)
    if role_level < 80:  # Supervisor level
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only supervisors and higher can assign technicians"
        )
    
    # Check if target user has technician role
    target_role_level = await get_user_role_level(db, user_id)
    if target_role_level < 50:  # Technician level
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must be a technician or higher"
        )
    
    await db.execute(
        queries.assign_technician,
        project_id, user_id
    )

async def remove_technician(
    db: Pool,
    project_id: int,
    user_id: int,
    current_user_id: int
) -> None:
    # Check if current user has supervisor role or higher
    role_level = await get_user_role_level(db, current_user_id)
    if role_level < 80:  # Supervisor level
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only supervisors and higher can remove technicians"
        )
    
    # Check if technician is assigned to the project
    is_assigned = await db.fetchval(
        queries.check_technician_assigned,
        project_id, user_id
    )
    if not is_assigned:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Technician is not assigned to this project"
        )
    
    await db.execute(
        queries.remove_technician,
        project_id, user_id
    ) 