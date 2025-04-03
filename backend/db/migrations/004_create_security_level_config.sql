-- Create security level configuration table
CREATE TABLE IF NOT EXISTS security_level_config (
    id SERIAL PRIMARY KEY,
    create_role INTEGER NOT NULL DEFAULT 10,
    view_roles INTEGER NOT NULL DEFAULT 5,
    manage_roles INTEGER NOT NULL DEFAULT 5,
    view_users INTEGER NOT NULL DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT security_level_check CHECK (
        create_role BETWEEN 1 AND 10 AND
        view_roles BETWEEN 1 AND 10 AND
        manage_roles BETWEEN 1 AND 10 AND
        view_users BETWEEN 1 AND 10
    )
);

-- Insert default configuration
INSERT INTO security_level_config (id, create_role, view_roles, manage_roles, view_users)
VALUES (1, 10, 5, 5, 5)
ON CONFLICT (id) DO NOTHING; 