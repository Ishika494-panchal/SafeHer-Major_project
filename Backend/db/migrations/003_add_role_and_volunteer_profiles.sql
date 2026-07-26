ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'woman'
    CHECK (role IN ('woman', 'volunteer'));

CREATE TABLE IF NOT EXISTS volunteer_profiles (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID         NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  id_proof_url VARCHAR(255),
  availability VARCHAR(100),
  verified     BOOLEAN      NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
