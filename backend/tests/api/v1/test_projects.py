import pytest
from datetime import date
from httpx import AsyncClient
from fastapi import status
from app.schemas.project import ProjectCreate, ProjectUpdate, AddressCreate, AddressUpdate

@pytest.mark.asyncio
async def test_create_project_success(client: AsyncClient, db_pool, admin_token_headers):
    """Test creating a project with valid data."""
    project_data = {"name": "Test Project", "company_id": 1}
    response = await client.post("/api/v1/projects/", json=project_data, headers=admin_token_headers)
    assert response.status_code == 201  # Updated to expect 201 Created
    data = response.json()
    assert data["name"] == "Test Project"
    assert "id" in data

@pytest.mark.asyncio
async def test_create_project_unauthorized(client: AsyncClient, db_pool, normal_user_token_headers):
    """Test creating a project without proper authorization."""
    project_data = {"name": "Test Project", "company_id": 1}
    response = await client.post("/api/v1/projects/", json=project_data, headers=normal_user_token_headers)
    assert response.status_code == 403

@pytest.mark.asyncio
async def test_get_project_success(client: AsyncClient, db_pool, technician_token_headers, admin_token_headers):
    """Test getting a project that exists."""
    # Create a project first
    project_data = {"name": "Test Project", "company_id": 1}
    create_response = await client.post("/api/v1/projects/", json=project_data, headers=admin_token_headers)
    project_id = create_response.json()["id"]

    # Get technician user ID from token
    tech_response = await client.get("/api/v1/users/me", headers=technician_token_headers)
    technician_id = tech_response.json()["id"]

    # Create an address
    address_data = {"name": "123 Test St", "address_line1": "123 Test Street", "city": "Test City"}
    address_response = await client.post("/api/v1/projects/addresses", json=address_data, headers=admin_token_headers)
    address_id = address_response.json()["id"]

    # Create a project visit (this is how technicians get associated with projects)
    from datetime import date
    visit_data = {
        "project_id": project_id,
        "address_id": address_id,
        "visit_date": date.today().isoformat(),
        "technician_id": technician_id,
        "notes": "Initial visit"
    }
    await client.post(f"/api/v1/projects/{project_id}/visits", json=visit_data, headers=admin_token_headers)

    # Get the project (technician should have access now through the project visit)
    response = await client.get(f"/api/v1/projects/{project_id}", headers=technician_token_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Project"
    assert data["id"] == project_id
    # Note: Removed addresses check since ProjectResponse doesn't include addresses field

@pytest.mark.asyncio
async def test_get_project_not_found(client: AsyncClient, db_pool, technician_token_headers):
    """Test getting a project that doesn't exist."""
    response = await client.get("/api/v1/projects/999", headers=technician_token_headers)
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_update_project_success(client: AsyncClient, db_pool, admin_token_headers):
    """Test updating a project with valid data."""
    # Create a project first
    project_data = {"name": "Test Project", "company_id": 1}
    create_response = await client.post("/api/v1/projects/", json=project_data, headers=admin_token_headers)
    project_id = create_response.json()["id"]

    # Update the project
    update_data = {"name": "Updated Project"}
    response = await client.put(f"/api/v1/projects/{project_id}", json=update_data, headers=admin_token_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Project"

@pytest.mark.asyncio
async def test_create_address_success(client: AsyncClient, db_pool, admin_token_headers):
    """Test creating a standalone address."""
    # Create an address (addresses are standalone entities)
    address_data = {
        "name": "123 Test St", 
        "address_line1": "123 Test Street",
        "city": "Test City",
        "state": "TS",
        "zip": "12345"
    }
    response = await client.post("/api/v1/projects/addresses", json=address_data, headers=admin_token_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "123 Test St"
    assert data["address_line1"] == "123 Test Street"

@pytest.mark.asyncio
async def test_create_project_visit_success(client: AsyncClient, db_pool, admin_token_headers, technician_token_headers):
    """Test creating a project visit."""
    # Create a project first
    project_data = {"name": "Test Project", "company_id": 1}
    create_response = await client.post("/api/v1/projects/", json=project_data, headers=admin_token_headers)
    project_id = create_response.json()["id"]

    # Create an address
    address_data = {"name": "123 Test St", "address_line1": "123 Test Street"}
    address_response = await client.post("/api/v1/projects/addresses", json=address_data, headers=admin_token_headers)
    address_id = address_response.json()["id"]

    # Get technician ID
    tech_response = await client.get("/api/v1/users/me", headers=technician_token_headers)
    technician_id = tech_response.json()["id"]

    # Create project visit
    visit_data = {
        "project_id": project_id,
        "address_id": address_id,
        "visit_date": date.today().isoformat(),
        "technician_id": technician_id,
        "notes": "Field visit for sampling"
    }
    response = await client.post(f"/api/v1/projects/{project_id}/visits", json=visit_data, headers=admin_token_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["project_id"] == project_id
    assert data["address_id"] == address_id
    assert data["technician_id"] == technician_id

@pytest.mark.asyncio
async def test_get_project_visits_success(client: AsyncClient, db_pool, admin_token_headers, technician_token_headers):
    """Test getting project visits."""
    # Create a project first
    project_data = {"name": "Test Project", "company_id": 1}
    create_response = await client.post("/api/v1/projects/", json=project_data, headers=admin_token_headers)
    project_id = create_response.json()["id"]

    # Create an address
    address_data = {"name": "123 Test St", "address_line1": "123 Test Street"}
    address_response = await client.post("/api/v1/projects/addresses", json=address_data, headers=admin_token_headers)
    address_id = address_response.json()["id"]

    # Get technician ID
    tech_response = await client.get("/api/v1/users/me", headers=technician_token_headers)
    technician_id = tech_response.json()["id"]

    # Create project visit
    visit_data = {
        "project_id": project_id,
        "address_id": address_id,
        "visit_date": date.today().isoformat(),
        "technician_id": technician_id,
        "notes": "Field visit for sampling"
    }
    await client.post(f"/api/v1/projects/{project_id}/visits", json=visit_data, headers=admin_token_headers)

    # Get project visits
    response = await client.get(f"/api/v1/projects/{project_id}/visits", headers=admin_token_headers)
    assert response.status_code == 200
    visits = response.json()
    assert len(visits) > 0
    assert visits[0]["project_id"] == project_id
    assert visits[0]["address_id"] == address_id

@pytest.mark.asyncio
async def test_create_project_visit_unauthorized(client: AsyncClient, db_pool, technician_token_headers):
    """Test creating a project visit without proper authorization."""
    # Create a project (this will fail for technician, but let's test the visit creation auth)
    visit_data = {
        "project_id": 999,  # Non-existent project
        "address_id": 999,  # Non-existent address  
        "visit_date": date.today().isoformat(),
        "technician_id": 1,
        "notes": "Unauthorized visit attempt"
    }
    response = await client.post(f"/api/v1/projects/999/visits", json=visit_data, headers=technician_token_headers)
    assert response.status_code in [403, 404]  # Either forbidden or not found

@pytest.mark.asyncio
async def test_get_project_addresses_success(client, admin_token_headers, technician_token_headers):
    """Test getting addresses associated with a project through visits."""
    # Create a project first
    response = await client.post(
        "/api/v1/projects/",
        headers=admin_token_headers,
        json={"name": "Test Project", "company_id": 1}
    )
    assert response.status_code == 201
    project = response.json()

    # Create an address
    address_data = {"name": "Test Address", "address_line1": "123 Test Street"}
    address_response = await client.post("/api/v1/projects/addresses", json=address_data, headers=admin_token_headers)
    address_id = address_response.json()["id"]

    # Get technician ID
    tech_response = await client.get("/api/v1/users/me", headers=technician_token_headers)
    technician_id = tech_response.json()["id"]

    # Create project visit (links address to project)
    visit_data = {
        "project_id": project["id"],
        "address_id": address_id,
        "visit_date": date.today().isoformat(),
        "technician_id": technician_id,
        "notes": "Field visit"
    }
    await client.post(f"/api/v1/projects/{project['id']}/visits", json=visit_data, headers=admin_token_headers)

    # Get addresses for this project
    response = await client.get(
        f"/api/v1/projects/{project['id']}/addresses",
        headers=admin_token_headers
    )
    assert response.status_code == 200
    addresses = response.json()
    assert len(addresses) > 0
    assert any(addr["name"] == "Test Address" for addr in addresses)

@pytest.mark.asyncio
async def test_update_address_success(client: AsyncClient, db_pool, admin_token_headers):
    """Test updating an address."""
    # Create an address
    address_data = {"name": "123 Test St", "address_line1": "123 Test Street"}
    create_response = await client.post("/api/v1/projects/addresses", json=address_data, headers=admin_token_headers)
    address_id = create_response.json()["id"]

    # Update address name
    update_data = {"name": "456 New St", "address_line1": "456 New Street"}
    response = await client.put(
        f"/api/v1/projects/addresses/{address_id}",
        json=update_data,
        headers=admin_token_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "456 New St"
    assert data["address_line1"] == "456 New Street"

@pytest.mark.asyncio
async def test_get_project_visits_by_date(client: AsyncClient, technician_token_headers, admin_token_headers):
    """Test getting project visits filtered by date."""
    # Create project 
    project_resp = await client.post("/api/v1/projects/", json={"name": "Test Project", "company_id": 1}, headers=admin_token_headers)
    project_id = project_resp.json()["id"]
    
    # Create address
    address_data = {"name": "Test Address", "address_line1": "123 Test Street"}
    addr_resp = await client.post("/api/v1/projects/addresses", json=address_data, headers=admin_token_headers)
    address_id = addr_resp.json()["id"]
    
    # Get technician ID
    tech_response = await client.get("/api/v1/users/me", headers=technician_token_headers)
    technician_id = tech_response.json()["id"]
    
    # Create visit for today
    today = date.today().isoformat()
    visit_data = {
        "project_id": project_id,
        "address_id": address_id,
        "visit_date": today,
        "technician_id": technician_id,
        "notes": "Today's visit"
    }
    await client.post(f"/api/v1/projects/{project_id}/visits", json=visit_data, headers=admin_token_headers)
    
    # Get visits for today
    resp = await client.get(f"/api/v1/projects/{project_id}/visits?visit_date={today}", headers=admin_token_headers)
    assert resp.status_code == 200
    visits = resp.json()
    assert len(visits) > 0
    assert visits[0]["visit_date"] == today
