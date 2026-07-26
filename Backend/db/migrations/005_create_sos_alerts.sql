CREATE TABLE IF NOT EXISTS sos_alerts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  latitude     FLOAT8      NOT NULL CHECK (latitude  BETWEEN -90  AND  90),
  longitude    FLOAT8      NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  status       VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'responded', 'resolved')),
  responder_id UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sos_alerts_status
  ON sos_alerts (status)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_sos_alerts_user_id
  ON sos_alerts (user_id);
