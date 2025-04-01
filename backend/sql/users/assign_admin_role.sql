INSERT INTO user_roles (user_id, role_id)
SELECT %s, role_id
FROM roles
WHERE name = 'admin'; 