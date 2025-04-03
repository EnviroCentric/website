INSERT INTO roles (name, description, security_level)
VALUES (%s, %s, %s)
RETURNING role_id, name, description, security_level, created_at, updated_at;