import pytest
from datetime import date
from httpx import AsyncClient
from fastapi import status
from app.schemas.project import ProjectCreate, ProjectUpdate, AddressCreate, AddressUpdate

@pytest.mark.asyncio
async def test_create_project_success(client: AsyncClient, db_pool, technician_token_headers):
    """Test creating a project with valid data."""
    project_data = {"name": "Test Project"}
    response = await client.post("/api/v1/projects/", json=project_data, headers=technician_token_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Project"
    assert "id" in data

@pytest.mark.asyncio
async def test_create_project_unauthorized(client: AsyncClient, db_pool, normal_user_token_headers):
    """Test creating a project without proper authorization."""
    project_data = {"name": "Test Project"}
    response = await client.post("/api/v1/projects/", json=project_data, headers=normal_user_token_headers)
    assert response.status_code == 403

@pytest.mark.asyncio
async def test_get_project_success(client: AsyncClient, db_pool, technician_token_headers, admin_token_headers):
    """Test getting a project that exists."""
    # Create a project first
    project_data = {"name": "Test Project"}
    create_response = await client.post("/api/v1/projects/", json=project_data, headers=admin_token_headers)
    project_id = create_response.json()["id"]

    # Get technician user ID from token
    tech_response = await client.get("/api/v1/users/me", headers=technician_token_headers)
    technician_id = tech_response.json()["id"]

    # Assign technician to project
    await client.post(
        f"/api/v1/projects/{project_id}/technicians",
        json={"user_id": technician_id},
        headers=admin_token_headers
    )

    # Get the project
    response = await client.get(f"/api/v1/projects/{project_id}", headers=technician_token_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Project"
    assert data["id"] == project_id
    assert isinstance(data["addresses"], list)

@pytest.mark.asyncio
async def test_get_project_not_found(client: AsyncClient, db_pool, technician_token_headers):
    """Test getting a project that doesn't exist."""
    response = await client.get("/api/v1/projects/999", headers=technician_token_headers)
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_update_project_success(client: AsyncClient, db_pool, technician_token_headers):
    """Test updating a project with valid data."""
    # Create a project first
    project_data = {"name": "Test Project"}
    create_response = await client.post("/api/v1/projects/", json=project_data, headers=technician_token_headers)
    project_id = create_response.json()["id"]

    # Update the project
    update_data = {"name": "Updated Project"}
    response = await client.patch(f"/api/v1/projects/{project_id}", json=update_data, headers=technician_token_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Project"

@pytest.mark.asyncio
async def test_create_address_success(client: AsyncClient, db_pool, technician_token_headers):
    """Test creating an address with valid data."""
    # Create a project first
    project_data = {"name": "Test Project"}
    create_response = await client.post("/api/v1/projects/", json=project_data, headers=technician_token_headers)
    project_id = create_response.json()["id"]

    # Create an address
    address_data = {"name": "123 Test St", "date": date.today().isoformat()}
    response = await client.post(f"/api/v1/projects/{project_id}/addresses", json=address_data, headers=technician_token_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "123 Test St"
    assert data["date"] == date.today().isoformat()

@pytest.mark.asyncio
async def test_create_duplicate_address_same_day(client: AsyncClient, db_pool, technician_token_headers):
    """Test creating a duplicate address on the same day."""
    # Create a project first
    project_data = {"name": "Test Project"}
    create_response = await client.post("/api/v1/projects/", json=project_data, headers=technician_token_headers)
    project_id = create_response.json()["id"]

    # Create first address
    address_data = {"name": "123 Test St", "date": date.today().isoformat()}
    await client.post(f"/api/v1/projects/{project_id}/addresses", json=address_data, headers=technician_token_headers)

    # Try to create duplicate address
    response = await client.post(f"/api/v1/projects/{project_id}/addresses", json=address_data, headers=technician_token_headers)
    assert response.status_code == 400

@pytest.mark.asyncio
async def test_assign_technician_success(client: AsyncClient, db_pool, admin_token_headers, technician_token_headers):
    """Test assigning a technician to a project."""
    # Create a project first
    project_data = {"name": "Test Project"}
    create_response = await client.post("/api/v1/projects/", json=project_data, headers=admin_token_headers)
    project_id = create_response.json()["id"]

    # Get technician user ID from token
    tech_response = await client.get("/api/v1/users/me", headers=technician_token_headers)
    technician_id = tech_response.json()["id"]

    # Assign technician
    response = await client.post(
        f"/api/v1/projects/{project_id}/technicians",
        json={"user_id": technician_id},
        headers=admin_token_headers
    )
    assert response.status_code == 204

@pytest.mark.asyncio
async def test_assign_technician_unauthorized(client: AsyncClient, db_pool, technician_token_headers):
    """Test assigning a technician without proper authorization."""
    # Create a project first
    project_data = {"name": "Test Project"}
    create_response = await client.post("/api/v1/projects/", json=project_data, headers=technician_token_headers)
    project_id = create_response.json()["id"]

    # Try to assign technician
    response = await client.post(
        f"/api/v1/projects/{project_id}/technicians",
        json={"user_id": 999},
        headers=technician_token_headers
    )
    assert response.status_code == 403

@pytest.mark.asyncio
async def test_remove_technician_success(client, admin_token_headers, technician_user, technician_token_headers):
    """Test removing a technician from a project."""
    # Create a project first
    response = await client.post(
        "/api/v1/projects/",
        headers=admin_token_headers,
        json={"name": "Test Project"}
    )
    assert response.status_code == 200
    project = response.json()

    # Assign technician
    response = await client.post(
        f"/api/v1/projects/{project['id']}/technicians",
        headers=admin_token_headers,
        json={"user_id": technician_user.id}
    )
    assert response.status_code == 204

    # Verify technician can access project
    response = await client.get(
        f"/api/v1/projects/{project['id']}",
        headers=technician_token_headers
    )
    assert response.status_code == 200

    # Remove technician
    response = await client.delete(
        f"/api/v1/projects/{project['id']}/technicians/{technician_user.id}",
        headers=admin_token_headers
    )
    assert response.status_code == 204

    # Verify technician can no longer access project
    response = await client.get(
        f"/api/v1/projects/{project['id']}",
        headers=technician_token_headers
    )
    assert response.status_code == 403

@pytest.mark.asyncio
async def test_update_address_preserves_date(client: AsyncClient, db_pool, technician_token_headers):
    """Test that updating an address preserves its original date."""
    # Create a project first
    project_data = {"name": "Test Project"}
    create_response = await client.post("/api/v1/projects/", json=project_data, headers=technician_token_headers)
    project_id = create_response.json()["id"]

    # Create address with specific date
    original_date = date(2024, 1, 1)
    address_data = {"name": "123 Test St", "date": original_date.isoformat()}
    create_response = await client.post(f"/api/v1/projects/{project_id}/addresses", json=address_data, headers=technician_token_headers)
    address_id = create_response.json()["id"]

    # Update address name
    update_data = {"name": "456 New St"}
    response = await client.patch(
        f"/api/v1/projects/{project_id}/addresses/{address_id}",
        json=update_data,
        headers=technician_token_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "456 New St"
    assert data["date"] == original_date.isoformat()

@pytest.mark.asyncio
async def test_get_addresses_for_today(client: AsyncClient, technician_token_headers, admin_token_headers):
    # Create project and address for today
    project_resp = await client.post("/api/v1/projects/", json={"name": "Test Project"}, headers=admin_token_headers)
    project_id = project_resp.json()["id"]
    today = date.today().isoformat()
    addr_resp = await client.post(f"/api/v1/projects/{project_id}/addresses", json={"name": "Test Address", "date": today}, headers=admin_token_headers)
    # Get addresses for today
    resp = await client.get(f"/api/v1/projects/{project_id}/addresses?date={today}", headers=admin_token_headers)
    assert resp.status_code == 200
    addresses = resp.json()
    assert any(addr["name"] == "Test Address" for addr in addresses) 