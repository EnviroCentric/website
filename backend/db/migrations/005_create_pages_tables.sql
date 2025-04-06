-- Create pages table
CREATE TABLE IF NOT EXISTS pages (
    page_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    path VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create page_roles table
CREATE TABLE IF NOT EXISTS page_roles (
    page_id INTEGER REFERENCES pages(page_id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES roles(role_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (page_id, role_id)
);

-- Insert default pages
INSERT INTO pages (name, path, description) VALUES
    ('Home', '/', 'Home page'),
    ('Profile', '/profile', 'User profile page'),
    ('Update Profile', '/profile/update', 'Update user profile page'),
    ('Manage Users', '/manage-users', 'User management page'),
    ('Manage Roles', '/manage-roles', 'Role management page'),
    ('Access Management', '/access-management', 'Access management page')
ON CONFLICT (path) DO NOTHING; 