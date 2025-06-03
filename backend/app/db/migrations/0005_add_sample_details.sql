-- Add additional fields to samples table
ALTER TABLE samples
    ADD COLUMN description TEXT,
    ADD COLUMN is_inside BOOLEAN,
    ADD COLUMN flow_rate INTEGER,
    ADD COLUMN volume_required INTEGER,
    ADD COLUMN start_time TIMESTAMP WITH TIME ZONE,
    ADD COLUMN stop_time TIMESTAMP WITH TIME ZONE,
    ADD COLUMN total_time_ran INTERVAL GENERATED ALWAYS AS (stop_time - start_time) STORED,
    ADD COLUMN fields INTEGER,
    ADD COLUMN fibers INTEGER; 