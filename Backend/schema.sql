-- =============================================================================
-- SafeHer Database Schema: SOS Alerts Table Creation (PostgreSQL + PostGIS)
-- Academic / Production Database DDL Script
-- =============================================================================

-- 1. Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- Provides UUID generation functions
CREATE EXTENSION IF NOT EXISTS "postgis";    -- Enables GIS spatial types & spatial indexes

-- 2. Create custom ENUM type for SOS alert status tracking
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sos_status_enum') THEN
        CREATE TYPE sos_status_enum AS ENUM ('active', 'resolved', 'cancelled');
    END IF;
END $$;

-- 3. Create the 'sos_alerts' table
CREATE TABLE IF NOT EXISTS sos_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL CHECK (latitude >= -90.0 AND latitude <= 90.0),
    longitude DOUBLE PRECISION NOT NULL CHECK (longitude >= -180.0 AND longitude <= 180.0),
    battery_percent INTEGER NOT NULL DEFAULT 100 CHECK (battery_percent >= 0 AND battery_percent <= 100),
    status sos_status_enum NOT NULL DEFAULT 'active',
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMPTZ NULL,

    -- PostGIS Generated Spatial Point Column (SRID 4326 = WGS 84 standard GPS CRS)
    location_geometry geometry(Point, 4326) 
        GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) STORED
);

-- 4. Create indexes for performance optimization
-- B-Tree index for quick lookup of active/all alerts for a specific user
CREATE INDEX IF NOT EXISTS idx_sos_alerts_user_id ON sos_alerts(user_id);

-- B-Tree index for filtering active alerts quickly
CREATE INDEX IF NOT EXISTS idx_sos_alerts_status ON sos_alerts(status);

-- B-Tree index for chronological sorting of emergency alerts
CREATE INDEX IF NOT EXISTS idx_sos_alerts_triggered_at ON sos_alerts(triggered_at DESC);

-- PostGIS Spatial GIST Index for ultra-fast spatial proximity searches (e.g. nearby responders)
CREATE INDEX IF NOT EXISTS idx_sos_alerts_location_gist ON sos_alerts USING GIST (location_geometry);

-- Comment explanations for academic documentation
COMMENT ON TABLE sos_alerts IS 'Stores emergency SOS distress alerts triggered by users in SafeHer';
COMMENT ON COLUMN sos_alerts.id IS 'Primary Key UUID generated automatically via PostgreSQL gen_random_uuid()';
COMMENT ON COLUMN sos_alerts.user_id IS 'Foreign key referencing users table (ON DELETE CASCADE)';
COMMENT ON COLUMN sos_alerts.latitude IS 'GPS Latitude coordinate (-90 to 90 degrees)';
COMMENT ON COLUMN sos_alerts.longitude IS 'GPS Longitude coordinate (-180 to 180 degrees)';
COMMENT ON COLUMN sos_alerts.battery_percent IS 'Device battery charge level percentage at trigger time (0 to 100)';
COMMENT ON COLUMN sos_alerts.status IS 'Current status of emergency dispatch (active, resolved, cancelled)';
COMMENT ON COLUMN sos_alerts.location_geometry IS 'PostGIS geometry point (SRID 4326 WGS84) computed automatically from lon/lat for spatial analysis';
