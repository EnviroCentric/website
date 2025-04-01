INSERT INTO user_roles (user_id, role_id)
VALUES (%s, %s)
ON CONFLICT (user_id, role_id) DO NOTHING; 