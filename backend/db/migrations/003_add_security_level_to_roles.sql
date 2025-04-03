-- Add security_level column to roles table
ALTER TABLE roles ADD COLUMN security_level INTEGER NOT NULL DEFAULT 1;

-- Add check constraint to ensure security_level is between 1 and 10
ALTER TABLE roles ADD CONSTRAINT check_security_level 
    CHECK (security_level >= 1 AND security_level <= 10);

-- Update existing roles with security levels
UPDATE roles SET security_level = 10 WHERE name = 'admin';
UPDATE roles SET security_level = 1 WHERE name = 'user';

-- Add comment
COMMENT ON COLUMN roles.security_level IS 'Security level for role-based access control (1-10). Higher numbers indicate higher privileges.'; 