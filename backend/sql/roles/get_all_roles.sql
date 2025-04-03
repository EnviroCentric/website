SELECT role_id, name, description, security_level, created_at, updated_at
FROM roles
ORDER BY security_level DESC, name; 