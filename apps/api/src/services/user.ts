import type { Kysely } from "kysely";
import type { User } from "@inspirehub/shared/types";
import type { Database, UsersTable } from "../lib/db";

function rowToUser(row: UsersTable): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    picture: row.picture,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function findUserByGoogleId(
  db: Kysely<Database>,
  googleId: string
): Promise<User | null> {
  const row = await db
    .selectFrom("users")
    .selectAll()
    .where("google_id", "=", googleId)
    .executeTakeFirst();

  return row ? rowToUser(row) : null;
}

export async function findUserById(
  db: Kysely<Database>,
  id: string
): Promise<User | null> {
  const row = await db
    .selectFrom("users")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst();

  return row ? rowToUser(row) : null;
}

export async function createUser(
  db: Kysely<Database>,
  params: {
    googleId: string;
    email: string;
    name: string;
    picture: string | null;
  }
): Promise<User> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db
    .insertInto("users")
    .values({
      id,
      google_id: params.googleId,
      email: params.email,
      name: params.name,
      picture: params.picture,
      created_at: now,
      updated_at: now,
    })
    .execute();

  const user = await findUserById(db, id);
  if (!user) {
    throw new Error("Failed to create user");
  }

  return user;
}

export async function updateUser(
  db: Kysely<Database>,
  id: string,
  params: {
    name?: string;
    picture?: string | null;
  }
): Promise<User | null> {
  const updates: Partial<UsersTable> = {
    updated_at: new Date().toISOString(),
  };

  if (params.name !== undefined) {
    updates.name = params.name;
  }

  if (params.picture !== undefined) {
    updates.picture = params.picture;
  }

  await db.updateTable("users").set(updates).where("id", "=", id).execute();

  return findUserById(db, id);
}

export async function findOrCreateUser(
  db: Kysely<Database>,
  params: {
    googleId: string;
    email: string;
    name: string;
    picture: string | null;
  }
): Promise<User> {
  const existing = await findUserByGoogleId(db, params.googleId);

  if (existing) {
    const updated = await updateUser(db, existing.id, {
      name: params.name,
      picture: params.picture,
    });
    return updated || existing;
  }

  return createUser(db, params);
}
