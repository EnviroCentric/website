import pytest
from datetime import date
from fastapi import HTTPException
from app.schemas.project import ProjectCreate, ProjectUpdate, AddressCreate, AddressUpdate
from app.services import projects as project_service

@pytest.mark.asyncio
async def test_create_project_success(db_pool, technician_user):
    """Test creating a project with valid data."""
    project_data = ProjectCreate(name="Test Project")
    project = await project_service.create_project(db_pool, project_data, technician_user.id)
    assert project.name == "Test Project"
    assert project.id is not None

@pytest.mark.asyncio
async def test_create_project_unauthorized(db_pool, test_user):
    """Test creating a project without proper authorization."""
    project_data = ProjectCreate(name="Test Project")
    with pytest.raises(HTTPException) as exc:
        await project_service.create_project(db_pool, project_data, test_user.id)
    assert exc.value.status_code == 403

@pytest.mark.asyncio
async def test_get_project_success(db_pool, admin_user, technician_user):
    """Test getting a project that exists."""
    # Create a project first
    project_data = ProjectCreate(name="Test Project")
    project = await project_service.create_project(db_pool, project_data, admin_user.id)

    # Assign technician to project
    await project_service.assign_technician(
        db_pool, project.id, technician_user.id, admin_user.id
    )

    # Get project
    result = await project_service.get_project(db_pool, project.id, technician_user.id)
    assert result.name == "Test Project"
    assert result.id == project.id
    assert isinstance(result.addresses, list)

@pytest.mark.asyncio
async def test_get_project_not_found(db_pool, technician_user):
    """Test getting a project that doesn't exist."""
    with pytest.raises(HTTPException) as exc:
        await project_service.get_project(db_pool, 999, technician_user.id)
    assert exc.value.status_code == 404

@pytest.mark.asyncio
async def test_update_project_success(db_pool, admin_user, technician_user):
    """Test updating a project with valid data."""
    # Create a project first
    project_data = ProjectCreate(name="Test Project")
    project = await project_service.create_project(db_pool, project_data, admin_user.id)

    # Assign technician to project
    await project_service.assign_technician(
        db_pool, project.id, technician_user.id, admin_user.id
    )

    # Update project
    update_data = ProjectUpdate(name="Updated Project")
    updated = await project_service.update_project(
        db_pool, project.id, update_data, technician_user.id
    )
    assert updated.name == "Updated Project"

@pytest.mark.asyncio
async def test_create_address_success(db_pool, admin_user, technician_user):
    """Test creating an address with valid data."""
    # Create a project first
    project_data = ProjectCreate(name="Test Project")
    project = await project_service.create_project(db_pool, project_data, admin_user.id)

    # Assign technician to project
    await project_service.assign_technician(
        db_pool, project.id, technician_user.id, admin_user.id
    )

    # Create address
    address_data = AddressCreate(name="123 Test St", date=date.today())
    address = await project_service.create_address(
        db_pool, project.id, address_data, technician_user.id
    )
    assert address.name == "123 Test St"
    assert address.date == date.today()

@pytest.mark.asyncio
async def test_create_duplicate_address_same_day(db_pool, admin_user, technician_user):
    """Test creating a duplicate address on the same day."""
    # Create a project first
    project_data = ProjectCreate(name="Test Project")
    project = await project_service.create_project(db_pool, project_data, admin_user.id)

    # Assign technician to project
    await project_service.assign_technician(
        db_pool, project.id, technician_user.id, admin_user.id
    )

    # Create first address
    address_data = AddressCreate(name="123 Test St", date=date.today())
    await project_service.create_address(
        db_pool, project.id, address_data, technician_user.id
    )

    # Try to create duplicate address
    with pytest.raises(HTTPException) as exc:
        await project_service.create_address(
            db_pool, project.id, address_data, technician_user.id
        )
    assert exc.value.status_code == 400

@pytest.mark.asyncio
async def test_assign_technician_success(db_pool, admin_user, technician_user):
    """Test assigning a technician to a project."""
    # Create a project first
    project_data = ProjectCreate(name="Test Project")
    project = await project_service.create_project(db_pool, project_data, admin_user.id)

    # Assign technician
    await project_service.assign_technician(
        db_pool, project.id, technician_user.id, admin_user.id
    )

    # Verify technician can access project
    result = await project_service.get_project(db_pool, project.id, technician_user.id)
    assert result.id == project.id

@pytest.mark.asyncio
async def test_assign_technician_unauthorized(db_pool, technician_user):
    """Test assigning a technician without proper authorization."""
    # Create a project first
    project_data = ProjectCreate(name="Test Project")
    project = await project_service.create_project(db_pool, project_data, technician_user.id)

    # Try to assign another technician (should fail)
    with pytest.raises(HTTPException) as exc:
        await project_service.assign_technician(
            db_pool, project.id, 999, technician_user.id
        )
    assert exc.value.status_code == 403

@pytest.mark.asyncio
async def test_remove_technician_success(db_pool, admin_user, technician_user):
    """Test removing a technician from a project."""
    # Create a project first
    project_data = ProjectCreate(name="Test Project")
    project = await project_service.create_project(db_pool, project_data, admin_user.id)

    # Assign technician
    await project_service.assign_technician(
        db_pool, project.id, technician_user.id, admin_user.id
    )

    # Remove technician
    await project_service.remove_technician(
        db_pool, project.id, technician_user.id, admin_user.id
    )

    # Verify technician can no longer access project
    with pytest.raises(HTTPException) as exc:
        await project_service.get_project(db_pool, project.id, technician_user.id)
    assert exc.value.status_code == 403

@pytest.mark.asyncio
async def test_update_address_preserves_date(db_pool, admin_user, technician_user):
    """Test that updating an address preserves its original date."""
    # Create a project first
    project_data = ProjectCreate(name="Test Project")
    project = await project_service.create_project(db_pool, project_data, admin_user.id)

    # Assign technician to project
    await project_service.assign_technician(
        db_pool, project.id, technician_user.id, admin_user.id
    )

    # Create address with specific date
    original_date = date(2024, 1, 1)
    address_data = AddressCreate(name="123 Test St", date=original_date)
    address = await project_service.create_address(
        db_pool, project.id, address_data, technician_user.id
    )

    # Update address name
    update_data = AddressUpdate(name="456 New St")
    updated = await project_service.update_address(
        db_pool, project.id, address.id, update_data, technician_user.id
    )

    # Verify name was updated but date remained the same
    assert updated.name == "456 New St"
    assert updated.date == original_date 