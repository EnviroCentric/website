SELECT role_id, name, description, created_at, updated_at
FROM roles
WHERE role_id = %s; 