# Testing Rules for New Endpoints

## Overview
Every new API endpoint must be accompanied by comprehensive tests. This document outlines the minimum testing requirements for different types of endpoints.

## General Testing Requirements

### 1. Test Structure
- All tests must be async and use `@pytest.mark.asyncio`
- Tests should be self-contained and not rely on external state
- Each test should create its own test data
- Tests should clean up after themselves

### 2. Test Categories
For each endpoint, test the following scenarios:

#### Authentication
- ✅ Unauthorized access (401)
- ✅ Authorized access with valid token
- ✅ Authorized access with invalid token

#### Input Validation
- ✅ Valid input data
- ✅ Invalid input data (422)
- ✅ Missing required fields
- ✅ Invalid field types
- ✅ Field length/format validation

#### Business Logic
- ✅ Success case
- ✅ Edge cases
- ✅ Error conditions
- ✅ Data integrity checks

## Endpoint-Specific Requirements

### GET Endpoints
- ✅ Returns correct data structure
- ✅ Returns correct status code
- ✅ Handles non-existent resources (404)
- ✅ Handles query parameters
- ✅ Handles pagination (if applicable)

### POST/PUT Endpoints
- ✅ Creates/updates resource successfully
- ✅ Returns correct response format
- ✅ Validates input data
- ✅ Handles duplicate data (if applicable)
- ✅ Updates related resources (if applicable)

### DELETE Endpoints
- ✅ Deletes resource successfully
- ✅ Returns correct status code
- ✅ Handles non-existent resources
- ✅ Handles related resource cleanup

## Example Test Structure

```python
@pytest.mark.asyncio
async def test_endpoint_success(client, db):
    # 1. Setup test data
    # 2. Make request
    # 3. Verify response
    # 4. Verify database state
    # 5. Cleanup (if needed)

@pytest.mark.asyncio
async def test_endpoint_unauthorized(client):
    # 1. Make request without auth
    # 2. Verify 401 response

@pytest.mark.asyncio
async def test_endpoint_invalid_data(client, db):
    # 1. Setup test data
    # 2. Make request with invalid data
    # 3. Verify 422 response
```

## Password-Specific Requirements

For password-related endpoints, test:
- ✅ Password strength requirements
- ✅ Current password verification
- ✅ Password hash verification
- ✅ Token refresh after password change

## Database Considerations
- Use transactions for test isolation
- Clean up test data after each test
- Verify database state after operations
- Handle concurrent operations (if applicable)

## Response Validation
- Verify status codes
- Verify response structure
- Verify data types
- Verify error messages

## Code Review Checklist
Before merging, ensure:
- [ ] All required test cases are implemented
- [ ] Tests pass in isolation and together
- [ ] No test data leaks between tests
- [ ] Error cases are properly handled
- [ ] Edge cases are covered
- [ ] Database operations are verified
- [ ] Response formats are validated
- [ ] Authentication is properly tested
- [ ] Input validation is comprehensive 