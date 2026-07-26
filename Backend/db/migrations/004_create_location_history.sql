CREATE TABLE IF NOT EXISTS location_history (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  latitude    FLOAT8       NOT NULL CHECK (latitude  BETWEEN -90  AND  90),
  longitude   FLOAT8       NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  recorded_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_location_history_user_id
  ON location_history (user_id);

CREATE INDEX IF NOT EXISTS idx_location_history_recorded_at
  ON location_history (recorded_at DESC);
