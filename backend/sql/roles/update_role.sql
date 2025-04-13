UPDATE roles
SET name = %s,
    description = %s,
    updated_at = CURRENT_TIMESTAMP
WHERE role_id = %s
RETURNING role_id, name, description, created_at, updated_at; 