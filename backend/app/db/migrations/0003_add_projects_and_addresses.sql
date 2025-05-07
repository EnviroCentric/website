-- Add technician role
INSERT INTO roles (name, description, level) VALUES
    ('technician', 'Technician with project management access', 50)
ON CONFLICT (name) DO UPDATE SET level = EXCLUDED.level;

-- Create addresses table
CREATE TABLE IF NOT EXISTS addresses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    sample_ids INTEGER[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Ensure unique combination of name and date
    CONSTRAINT unique_address_per_day UNIQUE (name, date)
);

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    address_ids INTEGER[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create project_technicians junction table to track which technicians are assigned to projects
CREATE TABLE IF NOT EXISTS project_technicians (
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (project_id, user_id)
);

-- Add index on addresses date for better query performance
CREATE INDEX idx_addresses_date ON addresses(date);

-- Add index on addresses name for better query performance
CREATE INDEX idx_addresses_name ON addresses(name); 