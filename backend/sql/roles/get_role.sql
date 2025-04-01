SELECT role_id, name, description, created_at, updated_at
FROM roles
WHERE name = %s;