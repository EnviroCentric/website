import pytest
from datetime import datetime, timedelta
from fastapi import status
from app.core.security import create_access_token

@pytest.mark.asyncio
async def test_get_sample_with_details(client, db, test_user, test_project, test_address, test_sample):
    """Test getting a sample with project and address details."""
    # Create access token
    access_token = create_access_token(test_user)
    headers = {"Authorization": f"Bearer {access_token}"}

    # Get sample with details
    response = await client.get(f"/api/v1/samples/{test_sample['id']}", headers=headers)
    assert response.status_code == status.HTTP_200_OK
    
    data = response.json()
    assert data["id"] == test_sample["id"]
    assert data["description"] == test_sample["description"]
    assert data["cassette_barcode"] == test_sample["cassette_barcode"]
    assert data["address_name"] == test_address["name"]
    assert data["project_name"] == test_project["name"]
    assert data["project_id"] == test_project["id"]

@pytest.mark.asyncio
async def test_get_sample_with_details_unauthorized(client, test_sample):
    """Test getting a sample without authentication."""
    response = await client.get(f"/api/v1/samples/{test_sample['id']}")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

@pytest.mark.asyncio
async def test_get_sample_with_details_not_found(client, db, test_user):
    """Test getting a non-existent sample."""
    access_token = create_access_token(test_user)
    headers = {"Authorization": f"Bearer {access_token}"}
    
    response = await client.get("/api/v1/samples/99999", headers=headers)
    assert response.status_code == status.HTTP_404_NOT_FOUND

@pytest.mark.asyncio
async def test_update_sample_with_details(client, db, test_user, test_sample):
    """Test updating a sample and verifying details are returned."""
    access_token = create_access_token(test_user)
    headers = {"Authorization": f"Bearer {access_token}"}
    
    update_data = {
        "fields": 10,
        "fibers": 5
    }
    
    response = await client.patch(
        f"/api/v1/samples/{test_sample['id']}",
        json=update_data,
        headers=headers
    )
    assert response.status_code == status.HTTP_200_OK
    
    data = response.json()
    assert data["fields"] == 10
    assert data["fibers"] == 5
    assert "address_name" in data
    assert "project_name" in data
    assert "project_id" in data 