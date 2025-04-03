SELECT COALESCE(MAX(r.security_level), 0)
FROM roles r
JOIN user_roles ur ON r.role_id = ur.role_id
WHERE ur.user_id = %s; 