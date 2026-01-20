import { type } from "arktype";

// User schema
export const UserSchema = type({
  id: "string",
  email: "string",
  name: "string",
  "picture?": "string | null",
});

export const UserPublicSchema = type({
  id: "string",
  email: "string",
  name: "string",
  "picture?": "string | null",
});

// Error response
export const ErrorResponseSchema = type({
  success: "false",
  error: {
    code: "string",
    message: "string",
  },
});

// GET /auth/google/url
export const GoogleAuthUrlQuerySchema = type({
  redirect_uri: "string",
  code_challenge: "string",
  code_challenge_method: "'S256'",
  "state?": "string",
});

export const GoogleAuthUrlResponseSchema = type({
  url: "string",
});

// POST /auth/google/callback
export const GoogleCallbackBodySchema = type({
  code: "string",
  code_verifier: "string",
  redirect_uri: "string",
});

export const GoogleCallbackResponseSchema = type({
  access_token: "string",
  refresh_token: "string",
  expires_in: "number",
  user: UserPublicSchema,
});

// POST /auth/refresh
export const RefreshTokenBodySchema = type({
  "refresh_token?": "string",
});

export const RefreshTokenResponseSchema = type({
  access_token: "string",
  refresh_token: "string",
  expires_in: "number",
});

// GET /auth/me
export const GetMeResponseSchema = type({
  user: UserSchema,
});

// POST /auth/logout
export const LogoutResponseSchema = type({
  success: "true",
});
