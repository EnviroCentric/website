SELECT role_id, name, description, security_level, created_at, updated_at
FROM roles
WHERE name = %s;