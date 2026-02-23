// Google ID Token verification for Cloudflare Workers
// Based on https://developers.google.com/identity/sign-in/web/backend-auth

interface GoogleIdTokenPayload {
  iss: string; // https://accounts.google.com
  azp: string;
  aud: string;
  sub: string; // Google user ID
  email: string;
  email_verified: boolean;
  name: string;
  picture: string;
  given_name?: string;
  family_name?: string;
  iat: number;
  exp: number;
}

interface JWK {
  kty: string;
  alg: string;
  use: string;
  kid: string;
  n: string;
  e: string;
}

interface JWKS {
  keys: JWK[];
}

const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

// Cache for Google's public keys
let jwksCache: { keys: JWKS; fetchedAt: number } | null = null;
const JWKS_CACHE_TTL = 60 * 60 * 1000; // 1 hour

async function getGooglePublicKeys(): Promise<JWKS> {
  const now = Date.now();

  if (jwksCache && now - jwksCache.fetchedAt < JWKS_CACHE_TTL) {
    return jwksCache.keys;
  }

  const response = await fetch(GOOGLE_JWKS_URL);
  if (!response.ok) {
    throw new Error("Failed to fetch Google public keys");
  }

  const keys = (await response.json()) as JWKS;
  jwksCache = { keys, fetchedAt: now };

  return keys;
}

function base64UrlDecode(str: string): Uint8Array {
  // Convert base64url to base64
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  // Add padding if needed
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function decodeJwtPart<T>(part: string): T {
  const decoded = base64UrlDecode(part);
  const text = new TextDecoder().decode(decoded);
  return JSON.parse(text) as T;
}

async function importRsaPublicKey(jwk: JWK): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    {
      kty: jwk.kty,
      n: jwk.n,
      e: jwk.e,
      alg: "RS256",
      use: "sig",
    },
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["verify"],
  );
}

export async function verifyGoogleIdToken(
  idToken: string,
  clientIds: string | string[],
): Promise<GoogleIdTokenPayload | null> {
  const parts = idToken.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  // Decode header to get kid
  const header = decodeJwtPart<{ alg: string; kid: string; typ: string }>(headerB64);

  if (header.alg !== "RS256") {
    return null;
  }

  // Get Google's public keys
  const jwks = await getGooglePublicKeys();
  let key = jwks.keys.find((k) => k.kid === header.kid);

  if (!key) {
    // Key not found, try refreshing cache
    jwksCache = null;
    const refreshedJwks = await getGooglePublicKeys();
    key = refreshedJwks.keys.find((k) => k.kid === header.kid);
    if (!key) {
      return null;
    }
  }

  // Import public key
  const publicKey = await importRsaPublicKey(key);

  // Verify signature
  const signedData = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signature = base64UrlDecode(signatureB64);

  const isValid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, signature, signedData);

  if (!isValid) {
    return null;
  }

  // Decode and validate payload
  const payload = decodeJwtPart<GoogleIdTokenPayload>(payloadB64);

  // Validate issuer
  if (!GOOGLE_ISSUERS.includes(payload.iss)) {
    return null;
  }

  // Validate audience (supports multiple client IDs for web/iOS/Android)
  const allowedIds = Array.isArray(clientIds) ? clientIds : [clientIds];
  if (!allowedIds.includes(payload.aud)) {
    return null;
  }

  // Validate expiration
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    return null;
  }

  return payload;
}
