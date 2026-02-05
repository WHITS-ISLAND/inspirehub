import { Kysely } from "kysely";
import { D1Dialect } from "kysely-d1";

// Database schema types
export interface Database {
  users: UsersTable;
  refresh_token_families: RefreshTokenFamiliesTable;
  nodes: NodesTable;
  tags: TagsTable;
  node_tags: NodeTagsTable;
  comments: CommentsTable;
  comment_mentions: CommentMentionsTable;
  likes: LikesTable;
  interested: InterestedTable;
  want_to_try: WantToTryTable;
}

export interface UsersTable {
  id: string;
  google_id: string;
  email: string;
  name: string;
  picture: string | null;
  created_at: string;
  updated_at: string;
}

export interface RefreshTokenFamiliesTable {
  id: string;
  user_id: string;
  current_token_jti: string;
  is_revoked: number; // SQLite doesn't have boolean
  created_at: string;
  updated_at: string;
}

export interface NodesTable {
  id: string;
  type: "issue" | "idea" | "project";
  title: string;
  content: string;
  author_id: string;
  created_at: string;
  updated_at: string;
}

export interface TagsTable {
  id: string;
  name: string;
  created_at: string;
}

export interface NodeTagsTable {
  node_id: string;
  tag_id: string;
  created_at: string;
}

export interface CommentsTable {
  id: string;
  node_id: string;
  parent_id: string | null;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface CommentMentionsTable {
  comment_id: string;
  mentioned_user_id: string;
  created_at: string;
}

export interface LikesTable {
  node_id: string;
  user_id: string;
  created_at: string;
}

export interface InterestedTable {
  node_id: string;
  user_id: string;
  created_at: string;
}

export interface WantToTryTable {
  node_id: string;
  user_id: string;
  created_at: string;
}

// Create Kysely instance
export function createDb(d1: D1Database): Kysely<Database> {
  return new Kysely<Database>({
    dialect: new D1Dialect({ database: d1 }),
  });
}
