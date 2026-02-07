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

// POST /auth/verify (ID Token verification)
export const VerifyIdTokenBodySchema = type({
  id_token: "string",
});

export const VerifyIdTokenResponseSchema = type({
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

// PATCH /auth/me
export const UpdateMeBodySchema = type({
  name: "string > 0",
});

export const UpdateMeResponseSchema = type({
  user: UserSchema,
});

// POST /auth/logout
export const LogoutResponseSchema = type({
  success: "true",
});
