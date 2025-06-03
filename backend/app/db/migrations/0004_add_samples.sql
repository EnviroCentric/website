-- Create samples table with initial fields
CREATE TABLE IF NOT EXISTS samples (
    id SERIAL PRIMARY KEY,
    address_id INTEGER REFERENCES addresses(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add index on address_id for better query performance
CREATE INDEX idx_samples_address_id ON samples(address_id); 