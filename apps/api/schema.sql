-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  google_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  picture TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);

-- Refresh token families (for token rotation & replay attack detection)
CREATE TABLE refresh_token_families (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  current_token_jti TEXT NOT NULL,
  is_revoked INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_refresh_token_families_user_id ON refresh_token_families(user_id);
CREATE INDEX idx_refresh_token_families_jti ON refresh_token_families(current_token_jti);
