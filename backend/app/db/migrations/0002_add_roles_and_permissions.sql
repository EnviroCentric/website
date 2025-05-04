-- Add level column to roles table
ALTER TABLE roles ADD COLUMN level INTEGER NOT NULL DEFAULT 0;

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Insert initial roles with their levels
INSERT INTO roles (name, description, level) VALUES
    ('admin', 'Administrator with full system access', 100),
    ('manager', 'Manager with elevated access', 90),
    ('supervisor', 'Supervisor with team management access', 80)
ON CONFLICT (name) DO UPDATE SET level = EXCLUDED.level;

-- Insert manage users permission
INSERT INTO permissions (name, description) VALUES
    ('manage_users', 'Permission to manage user accounts and access')
ON CONFLICT (name) DO NOTHING;

-- Assign manage_users permission to manager and supervisor roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('manager', 'supervisor')
AND p.name = 'manage_users'
ON CONFLICT DO NOTHING; 