INSERT INTO roles (name, description)
VALUES (%s, %s)
RETURNING role_id, name, description, created_at, updated_at;