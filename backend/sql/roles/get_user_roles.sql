SELECT r.role_id, r.name, r.description, r.security_level, r.created_at, r.updated_at
FROM roles r
JOIN user_roles ur ON r.role_id = ur.role_id
WHERE ur.user_id = %s
ORDER BY r.security_level DESC, r.name; 