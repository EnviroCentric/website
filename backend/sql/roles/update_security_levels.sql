UPDATE security_level_config
SET create_role = %s,
    view_roles = %s,
    manage_roles = %s,
    view_users = %s,
    updated_at = NOW()
WHERE id = 1
RETURNING create_role, view_roles, manage_roles, view_users; 