import type { Kysely } from "kysely";
import type { Database, RefreshTokenFamiliesTable } from "../lib/db";

export async function createTokenFamily(
  db: Kysely<Database>,
  userId: string,
  tokenJti: string,
): Promise<string> {
  const familyId = crypto.randomUUID();
  const now = new Date().toISOString();

  await db
    .insertInto("refresh_token_families")
    .values({
      id: familyId,
      user_id: userId,
      current_token_jti: tokenJti,
      is_revoked: 0,
      created_at: now,
      updated_at: now,
    })
    .execute();

  return familyId;
}

async function getTokenFamily(
  db: Kysely<Database>,
  familyId: string,
): Promise<RefreshTokenFamiliesTable | undefined> {
  return db
    .selectFrom("refresh_token_families")
    .selectAll()
    .where("id", "=", familyId)
    .executeTakeFirst();
}

export async function updateTokenFamily(
  db: Kysely<Database>,
  familyId: string,
  newJti: string,
): Promise<void> {
  await db
    .updateTable("refresh_token_families")
    .set({
      current_token_jti: newJti,
      updated_at: new Date().toISOString(),
    })
    .where("id", "=", familyId)
    .execute();
}

export async function revokeTokenFamily(db: Kysely<Database>, familyId: string): Promise<void> {
  await db
    .updateTable("refresh_token_families")
    .set({
      is_revoked: 1,
      updated_at: new Date().toISOString(),
    })
    .where("id", "=", familyId)
    .execute();
}

export async function validateRefreshToken(
  db: Kysely<Database>,
  familyId: string,
  tokenJti: string,
): Promise<{ valid: boolean; userId?: string; reason?: string }> {
  const family = await getTokenFamily(db, familyId);

  if (!family) {
    return { valid: false, reason: "Token family not found" };
  }

  if (family.is_revoked === 1) {
    return { valid: false, reason: "Token family revoked" };
  }

  // Check for replay attack (token reuse)
  if (family.current_token_jti !== tokenJti) {
    await revokeTokenFamily(db, familyId);
    return { valid: false, reason: "Token replay detected" };
  }

  return { valid: true, userId: family.user_id };
}
