import { sign, verify } from "hono/jwt";
import type { JWTPayload } from "hono/utils/jwt/types";

// Access Token Payload
export interface AccessTokenPayload extends JWTPayload {
  sub: string;
  email: string;
  type: "access";
}

// Refresh Token Payload
export interface RefreshTokenPayload extends JWTPayload {
  sub: string;
  type: "refresh";
  family_id: string;
  jti: string;
}

// Generate Access Token (15 minutes)
export async function generateAccessToken(
  userId: string,
  userEmail: string,
  secret: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: AccessTokenPayload = {
    sub: userId,
    email: userEmail,
    type: "access",
    iat: now,
    exp: now + 15 * 60,
  };

  return sign(payload, secret);
}

// Generate Refresh Token (30 days)
export async function generateRefreshToken(
  userId: string,
  familyId: string,
  jti: string,
  secret: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: RefreshTokenPayload = {
    sub: userId,
    type: "refresh",
    family_id: familyId,
    jti,
    iat: now,
    exp: now + 30 * 24 * 60 * 60,
  };

  return sign(payload, secret);
}

// Verify JWT and return payload (returns null if invalid)
export async function verifyJwt<T extends JWTPayload>(
  token: string,
  secret: string
): Promise<T | null> {
  try {
    const payload = await verify(token, secret, "HS256");
    return payload as T;
  } catch {
    return null;
  }
}
