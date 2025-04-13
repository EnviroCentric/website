SELECT permission_name
FROM role_permissions
WHERE role_id = %s
ORDER BY permission_name; 