// ===== User =====
export interface User {
  id: string;
  email: string;
  name: string;
  picture: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserPublic {
  id: string;
  email: string;
  name: string;
  picture: string | null;
}

// ===== JWT Payloads =====
export interface AccessTokenPayload {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;
  nbf: number;
  jti: string;
  email: string;
  name: string;
  picture: string;
}

export interface RefreshTokenPayload {
  iss: string;
  sub: string;
  exp: number;
  iat: number;
  jti: string;
  type: "refresh";
  family: string;
}

// ===== API Request/Response =====

// GET /auth/google/url
export interface GoogleAuthUrlRequest {
  redirect_uri: string;
  state?: string;
  code_challenge: string;
  code_challenge_method: "S256";
}

export interface GoogleAuthUrlResponse {
  url: string;
}

// POST /auth/google/callback
export interface GoogleCallbackRequest {
  code: string;
  code_verifier: string;
  redirect_uri: string;
}

export interface GoogleCallbackResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: UserPublic;
}

// POST /auth/refresh
export interface RefreshTokenRequest {
  refresh_token?: string; // Cookie から取得する場合は不要
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

// GET /auth/me
export interface GetMeResponse {
  user: User;
}

// POST /auth/logout
export interface LogoutResponse {
  success: boolean;
}

// ===== Constants =====
export const TOKEN_EXPIRY = {
  ACCESS_TOKEN_SECONDS: 15 * 60, // 15分
  REFRESH_TOKEN_SECONDS: 30 * 24 * 60 * 60, // 30日
} as const;

export const JWT_CONFIG = {
  ISSUER: "inspirehub-api",
  AUDIENCE_WEB: "inspirehub-web",
  AUDIENCE_NATIVE: "inspirehub-native",
  ALGORITHM: "ES256",
} as const;
