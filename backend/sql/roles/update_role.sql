UPDATE roles
SET name = %s,
    description = %s,
    security_level = %s,
    updated_at = CURRENT_TIMESTAMP
WHERE role_id = %s
RETURNING role_id, name, description, security_level, created_at, updated_at; 