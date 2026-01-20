// Simple JWT implementation using HS256 (HMAC with SHA-256)
import type { AccessTokenPayload, RefreshTokenPayload } from "@inspirehub/shared/types";

// Base64URL encode
function base64urlEncode(data: string | ArrayBuffer): string {
  const bytes =
    typeof data === "string"
      ? new TextEncoder().encode(data)
      : new Uint8Array(data);
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Base64URL decode to string
function base64urlDecode(str: string): string {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return atob(padded);
}

// Import secret key for HMAC
async function importSecretKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

// Sign JWT with HS256
export async function signJwt(
  payload: Record<string, unknown>,
  secret: string
): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const key = await importSecretKey(secret);

  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data)
  );

  const encodedSignature = base64urlEncode(signature);
  return `${data}.${encodedSignature}`;
}

// Verify JWT with HS256
export async function verifyJwt(
  jwt: string,
  secret: string
): Promise<Record<string, unknown>> {
  const [encodedHeader, encodedPayload, encodedSignature] = jwt.split(".");

  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw new Error("Invalid JWT format");
  }

  const key = await importSecretKey(secret);
  const data = `${encodedHeader}.${encodedPayload}`;

  // Decode signature from base64url
  const signatureStr = base64urlDecode(encodedSignature);
  const signature = new Uint8Array(signatureStr.length);
  for (let i = 0; i < signatureStr.length; i++) {
    signature[i] = signatureStr.charCodeAt(i);
  }

  const isValid = await crypto.subtle.verify(
    "HMAC",
    key,
    signature,
    new TextEncoder().encode(data)
  );

  if (!isValid) {
    throw new Error("Invalid JWT signature");
  }

  const payload = JSON.parse(base64urlDecode(encodedPayload));

  // Check expiration
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("JWT expired");
  }

  return payload;
}

// Generate Access Token
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
    exp: now + 15 * 60, // 15 minutes
  };

  return signJwt(payload, secret);
}

// Generate Refresh Token
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
    exp: now + 30 * 24 * 60 * 60, // 30 days
  };

  return signJwt(payload, secret);
}