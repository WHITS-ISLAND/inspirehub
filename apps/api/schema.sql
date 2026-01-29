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

-- Nodes table
CREATE TABLE nodes (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(
    type = 'issue' OR
    type = 'idea' OR
    type = 'project'
  ),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_nodes_author_id ON nodes(author_id);
CREATE INDEX idx_nodes_type ON nodes(type);
CREATE INDEX idx_nodes_created_at ON nodes(created_at);
CREATE INDEX idx_nodes_updated_at ON nodes(updated_at);
CREATE INDEX idx_nodes_type_created_at ON nodes(type, created_at);
CREATE INDEX idx_nodes_author_type ON nodes(author_id, type);

-- Tags table
CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_tags_name ON tags(name);

-- Node-Tag relation table (many-to-many)
CREATE TABLE node_tags (
  node_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (node_id, tag_id),
  FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX idx_node_tags_node_id ON node_tags(node_id);
CREATE INDEX idx_node_tags_tag_id ON node_tags(tag_id);

-- Comments table
CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  node_id TEXT NOT NULL,
  parent_id TEXT,  -- NULL=トップレベル、値あり=リプライ
  author_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_comments_node_id ON comments(node_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);
CREATE INDEX idx_comments_author_id ON comments(author_id);
CREATE INDEX idx_comments_created_at ON comments(created_at);

-- Comment mentions table (ユーザーへのメンション)
CREATE TABLE comment_mentions (
  comment_id TEXT NOT NULL,
  mentioned_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (comment_id, mentioned_user_id),
  FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
  FOREIGN KEY (mentioned_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_comment_mentions_user_id ON comment_mentions(mentioned_user_id);
CREATE INDEX idx_comment_mentions_comment_id ON comment_mentions(comment_id);

-- Likes table (シンプルないいね機能)
CREATE TABLE likes (
  node_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (node_id, user_id),
  FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_likes_node_id ON likes(node_id);
CREATE INDEX idx_likes_user_id ON likes(user_id);
CREATE INDEX idx_likes_created_at ON likes(created_at);
