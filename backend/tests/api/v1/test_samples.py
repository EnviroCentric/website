import pytest
from datetime import datetime, timezone
from httpx import AsyncClient
from fastapi import status

pytestmark = pytest.mark.asyncio

async def test_create_sample_success(client: AsyncClient, technician_token_headers):
    """Test creating a sample with valid data."""
    # First create a project and address
    project_data = {"name": "Test Project"}
    project_response = await client.post("/api/v1/projects/", json=project_data, headers=technician_token_headers)
    project_id = project_response.json()["id"]

    address_data = {"name": "123 Test St", "date": datetime.now(timezone.utc).date().isoformat()}
    address_response = await client.post(f"/api/v1/projects/{project_id}/addresses", json=address_data, headers=technician_token_headers)
    address_id = address_response.json()["id"]

    # Create sample
    sample_data = {
        "address_id": address_id,
        "description": "Test sample description"
    }
    response = await client.post("/api/v1/samples/", json=sample_data, headers=technician_token_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["address_id"] == address_id
    assert "id" in data
    assert "created_at" in data

async def test_create_sample_unauthorized(client: AsyncClient, normal_user_token_headers):
    """Test creating a sample without proper authorization."""
    sample_data = {
        "address_id": 1,
        "description": "Test sample description"
    }
    response = await client.post("/api/v1/samples/", json=sample_data, headers=normal_user_token_headers)
    assert response.status_code == 403

async def test_get_sample_success(client: AsyncClient, technician_token_headers):
    """Test getting a sample that exists."""
    # First create a project, address, and sample
    project_data = {"name": "Test Project"}
    project_response = await client.post("/api/v1/projects/", json=project_data, headers=technician_token_headers)
    project_id = project_response.json()["id"]

    address_data = {"name": "123 Test St", "date": datetime.now(timezone.utc).date().isoformat()}
    address_response = await client.post(f"/api/v1/projects/{project_id}/addresses", json=address_data, headers=technician_token_headers)
    address_id = address_response.json()["id"]

    sample_data = {
        "address_id": address_id,
        "description": "Test sample description"
    }
    create_response = await client.post("/api/v1/samples/", json=sample_data, headers=technician_token_headers)
    sample_id = create_response.json()["id"]

    # Get the sample
    response = await client.get(f"/api/v1/samples/{sample_id}", headers=technician_token_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == sample_id
    assert data["address_id"] == address_id

async def test_get_sample_not_found(client: AsyncClient, technician_token_headers):
    """Test getting a sample that doesn't exist."""
    response = await client.get("/api/v1/samples/999", headers=technician_token_headers)
    assert response.status_code == 404

async def test_update_sample_success(client: AsyncClient, technician_token_headers):
    """Test updating a sample with valid data."""
    # First create a project, address, and sample
    project_data = {"name": "Test Project"}
    project_response = await client.post("/api/v1/projects/", json=project_data, headers=technician_token_headers)
    project_id = project_response.json()["id"]

    address_data = {"name": "123 Test St", "date": datetime.now(timezone.utc).date().isoformat()}
    address_response = await client.post(f"/api/v1/projects/{project_id}/addresses", json=address_data, headers=technician_token_headers)
    address_id = address_response.json()["id"]

    sample_data = {
        "address_id": address_id,
        "description": "Test sample description"
    }
    create_response = await client.post("/api/v1/samples/", json=sample_data, headers=technician_token_headers)
    sample_id = create_response.json()["id"]

    # Update the sample
    update_data = {
        "description": "Updated description",
        "is_inside": True,
        "flow_rate": 100,
        "volume_required": 200,
        "fields": 5,
        "fibers": 10
    }
    response = await client.patch(f"/api/v1/samples/{sample_id}", json=update_data, headers=technician_token_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["description"] == update_data["description"]
    assert data["is_inside"] == update_data["is_inside"]
    assert data["flow_rate"] == update_data["flow_rate"]
    assert data["volume_required"] == update_data["volume_required"]
    assert data["fields"] == update_data["fields"]
    assert data["fibers"] == update_data["fibers"]

async def test_update_sample_invalid_data(client: AsyncClient, technician_token_headers):
    """Test updating a sample with invalid data."""
    # First create a project, address, and sample
    project_data = {"name": "Test Project"}
    project_response = await client.post("/api/v1/projects/", json=project_data, headers=technician_token_headers)
    project_id = project_response.json()["id"]

    address_data = {"name": "123 Test St", "date": datetime.now(timezone.utc).date().isoformat()}
    address_response = await client.post(f"/api/v1/projects/{project_id}/addresses", json=address_data, headers=technician_token_headers)
    address_id = address_response.json()["id"]

    sample_data = {
        "address_id": address_id,
        "description": "Test sample description"
    }
    create_response = await client.post("/api/v1/samples/", json=sample_data, headers=technician_token_headers)
    sample_id = create_response.json()["id"]

    # Try to update with invalid data
    update_data = {
        "flow_rate": -1,  # Negative value not allowed
        "volume_required": -1  # Negative value not allowed
    }
    response = await client.patch(f"/api/v1/samples/{sample_id}", json=update_data, headers=technician_token_headers)
    assert response.status_code == 422

async def test_delete_sample_success(client: AsyncClient, admin_token_headers):
    """Test deleting a sample as supervisor or higher."""
    # First create a project, address, and sample
    project_data = {"name": "Test Project"}
    project_response = await client.post("/api/v1/projects/", json=project_data, headers=admin_token_headers)
    project_id = project_response.json()["id"]

    address_data = {"name": "123 Test St", "date": datetime.now(timezone.utc).date().isoformat()}
    address_response = await client.post(f"/api/v1/projects/{project_id}/addresses", json=address_data, headers=admin_token_headers)
    address_id = address_response.json()["id"]

    sample_data = {
        "address_id": address_id,
        "description": "Test sample description"
    }
    create_response = await client.post("/api/v1/samples/", json=sample_data, headers=admin_token_headers)
    sample_id = create_response.json()["id"]

    # Delete the sample
    response = await client.delete(f"/api/v1/samples/{sample_id}", headers=admin_token_headers)
    assert response.status_code == 204

    # Verify sample is deleted
    get_response = await client.get(f"/api/v1/samples/{sample_id}", headers=admin_token_headers)
    assert get_response.status_code == 404

async def test_delete_sample_unauthorized(client: AsyncClient, technician_token_headers):
    """Test that technicians cannot delete samples."""
    # First create a project, address, and sample
    project_data = {"name": "Test Project"}
    project_response = await client.post("/api/v1/projects/", json=project_data, headers=technician_token_headers)
    project_id = project_response.json()["id"]

    address_data = {"name": "123 Test St", "date": datetime.now(timezone.utc).date().isoformat()}
    address_response = await client.post(f"/api/v1/projects/{project_id}/addresses", json=address_data, headers=technician_token_headers)
    address_id = address_response.json()["id"]

    sample_data = {
        "address_id": address_id,
        "description": "Test sample description"
    }
    create_response = await client.post("/api/v1/samples/", json=sample_data, headers=technician_token_headers)
    sample_id = create_response.json()["id"]

    # Try to delete the sample as a technician
    response = await client.delete(f"/api/v1/samples/{sample_id}", headers=technician_token_headers)
    assert response.status_code == 403
    assert "Only supervisors and higher roles can delete samples" in response.json()["detail"]

    # Verify sample still exists
    get_response = await client.get(f"/api/v1/samples/{sample_id}", headers=technician_token_headers)
    assert get_response.status_code == 200

async def test_get_samples_by_address_success(client: AsyncClient, technician_token_headers):
    """Test getting all samples for an address."""
    # First create a project and address
    project_data = {"name": "Test Project"}
    project_response = await client.post("/api/v1/projects/", json=project_data, headers=technician_token_headers)
    project_id = project_response.json()["id"]

    address_data = {"name": "123 Test St", "date": datetime.now(timezone.utc).date().isoformat()}
    address_response = await client.post(f"/api/v1/projects/{project_id}/addresses", json=address_data, headers=technician_token_headers)
    address_id = address_response.json()["id"]

    # Create multiple samples
    for i in range(3):
        sample_data = {
            "address_id": address_id,
            "description": f"Test sample description {i}"
        }
        await client.post("/api/v1/samples/", json=sample_data, headers=technician_token_headers)

    # Get samples by address
    response = await client.get(f"/api/v1/samples/address/{address_id}", headers=technician_token_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 3
    assert all(sample["address_id"] == address_id for sample in data)

async def test_list_samples_success(client: AsyncClient, technician_token_headers):
    """Test listing all samples."""
    # First create a project and address
    project_data = {"name": "Test Project"}
    project_response = await client.post("/api/v1/projects/", json=project_data, headers=technician_token_headers)
    project_id = project_response.json()["id"]

    address_data = {"name": "123 Test St", "date": datetime.now(timezone.utc).date().isoformat()}
    address_response = await client.post(f"/api/v1/projects/{project_id}/addresses", json=address_data, headers=technician_token_headers)
    address_id = address_response.json()["id"]

    # Create multiple samples
    for i in range(3):
        sample_data = {
            "address_id": address_id,
            "description": f"Test sample description {i}"
        }
        await client.post("/api/v1/samples/", json=sample_data, headers=technician_token_headers)

    # List all samples
    response = await client.get("/api/v1/samples/", headers=technician_token_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 3  # Could be more if other tests created samples 