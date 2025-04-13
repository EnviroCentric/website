INSERT INTO role_permissions (role_id, permission_name)
VALUES (%s, %s)
ON CONFLICT (role_id, permission_name) DO NOTHING; 