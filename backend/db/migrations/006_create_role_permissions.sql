-- Create role permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    permission_name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, permission_name)
);

-- Add default permissions for admin role
INSERT INTO role_permissions (role_id, permission_name)
SELECT role_id, 'manage_users'
FROM roles
WHERE name = 'admin'
ON CONFLICT (role_id, permission_name) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_name)
SELECT role_id, 'manage_roles'
FROM roles
WHERE name = 'admin'
ON CONFLICT (role_id, permission_name) DO NOTHING;

-- Add comments
COMMENT ON TABLE role_permissions IS 'Stores permissions for each role';
COMMENT ON COLUMN role_permissions.role_id IS 'Foreign key to roles table';
COMMENT ON COLUMN role_permissions.permission_name IS 'Name of the permission';
COMMENT ON COLUMN role_permissions.created_at IS 'When the permission was assigned to the role'; 