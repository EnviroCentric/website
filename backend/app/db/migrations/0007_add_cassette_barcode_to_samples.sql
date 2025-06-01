-- Add cassette_barcode column to samples table
ALTER TABLE samples ADD COLUMN cassette_barcode TEXT;
-- Make it NOT NULL with a default for existing rows
UPDATE samples SET cassette_barcode = '' WHERE cassette_barcode IS NULL;
ALTER TABLE samples ALTER COLUMN cassette_barcode SET NOT NULL; 