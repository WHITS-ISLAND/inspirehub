import { Kysely } from "kysely";
import { D1Dialect } from "kysely-d1";

// Database schema types
export interface Database {
  users: UsersTable;
  refresh_token_families: RefreshTokenFamiliesTable;
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

// Create Kysely instance
export function createDb(d1: D1Database): Kysely<Database> {
  return new Kysely<Database>({
    dialect: new D1Dialect({ database: d1 }),
  });
}
