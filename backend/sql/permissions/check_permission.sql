SELECT 1
FROM role_permissions rp
JOIN user_roles ur ON rp.role_id = ur.role_id
WHERE ur.user_id = %s AND rp.permission_name = %s
LIMIT 1; 