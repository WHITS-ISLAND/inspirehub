import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { describeRoute, resolver, validator } from "hono-openapi";
import type { HonoEnv } from "../types/bindings";
import { verifyGoogleIdToken } from "../services/google-auth";
import { findOrCreateUser, findUserById } from "../services/user";
import {
  createTokenFamily,
  updateTokenFamily,
  validateRefreshToken,
  revokeTokenFamily,
} from "../services/token";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyJwt,
  type RefreshTokenPayload,
} from "../lib/jwt";
import { createDb } from "../lib/db";
import { authMiddleware } from "../middleware/auth";
import {
  RefreshTokenBodySchema,
  RefreshTokenResponseSchema,
  GetMeResponseSchema,
  LogoutResponseSchema,
  ErrorResponseSchema,
  VerifyIdTokenBodySchema,
  VerifyIdTokenResponseSchema,
} from "../schemas/auth";

const auth = new Hono<HonoEnv>();

// POST /auth/verify - Verify Google ID Token
auth.post(
  "/verify",
  describeRoute({
    tags: ["Auth"],
    summary: "Verify Google ID Token",
    description: "Verify Google ID Token and return access/refresh tokens",
    responses: {
      200: {
        description: "Authentication successful",
        content: {
          "application/json": {
            schema: resolver(VerifyIdTokenResponseSchema),
          },
        },
      },
      401: {
        description: "Invalid ID Token",
        content: {
          "application/json": {
            schema: resolver(ErrorResponseSchema),
          },
        },
      },
    },
  }),
  validator("json", VerifyIdTokenBodySchema),
  async (c) => {
    const { id_token } = c.req.valid("json");

    // Verify Google ID Token
    const googlePayload = await verifyGoogleIdToken(id_token, c.env.GOOGLE_CLIENT_ID);

    if (!googlePayload) {
      return c.json(
        {
          success: false as const,
          error: {
            code: "INVALID_ID_TOKEN",
            message: "Invalid or expired ID token",
          },
        },
        401,
      );
    }

    // Find or create user in D1
    const db = createDb(c.env.DB);
    const user = await findOrCreateUser(db, {
      googleId: googlePayload.sub,
      email: googlePayload.email,
      name: googlePayload.name,
      picture: googlePayload.picture,
    });

    // Generate JWT tokens
    const accessToken = await generateAccessToken(user.id, user.email, c.env.JWT_ACCESS_SECRET);

    // Create token family for refresh token
    const jti = crypto.randomUUID();
    const familyId = await createTokenFamily(db, user.id, jti);
    const refreshToken = await generateRefreshToken(
      user.id,
      familyId,
      jti,
      c.env.JWT_REFRESH_SECRET,
    );

    // Set tokens in HttpOnly cookies
    setCookie(c, "refresh_token", refreshToken, {
      httpOnly: true,
      secure: c.env.ENVIRONMENT !== "development",
      sameSite: "Lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    setCookie(c, "access_token", accessToken, {
      httpOnly: true,
      secure: c.env.ENVIRONMENT !== "development",
      sameSite: "Lax",
      path: "/",
      maxAge: 15 * 60,
    });

    return c.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 15 * 60,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
    });
  },
);

// POST /auth/refresh - Refresh access token
auth.post(
  "/refresh",
  describeRoute({
    tags: ["Auth"],
    summary: "Refresh access token",
    description: "Exchange refresh token for new access token",
    responses: {
      200: {
        description: "Token refreshed",
        content: {
          "application/json": {
            schema: resolver(RefreshTokenResponseSchema),
          },
        },
      },
      401: {
        description: "Unauthorized",
        content: {
          "application/json": {
            schema: resolver(ErrorResponseSchema),
          },
        },
      },
    },
  }),
  validator("json", RefreshTokenBodySchema),
  async (c) => {
    const body = c.req.valid("json");
    const cookieToken = getCookie(c, "refresh_token");
    const refreshToken = cookieToken || body.refresh_token;

    if (!refreshToken) {
      return c.json(
        {
          success: false as const,
          error: { code: "UNAUTHORIZED", message: "Refresh token required" },
        },
        401,
      );
    }

    // Verify refresh token
    const payload = (await verifyJwt(
      refreshToken,
      c.env.JWT_REFRESH_SECRET,
    )) as RefreshTokenPayload | null;

    if (!payload || payload.type !== "refresh") {
      return c.json(
        {
          success: false as const,
          error: {
            code: "INVALID_REFRESH_TOKEN",
            message: "Invalid refresh token",
          },
        },
        401,
      );
    }

    // Validate token family
    const db = createDb(c.env.DB);
    const validation = await validateRefreshToken(db, payload.family_id, payload.jti);

    if (!validation.valid) {
      deleteCookie(c, "refresh_token");
      return c.json(
        {
          success: false as const,
          error: {
            code: "INVALID_REFRESH_TOKEN",
            message: validation.reason || "Invalid refresh token",
          },
        },
        401,
      );
    }

    // Get user
    const user = await findUserById(db, payload.sub);
    if (!user) {
      return c.json(
        {
          success: false as const,
          error: { code: "USER_NOT_FOUND", message: "User not found" },
        },
        404,
      );
    }

    // Generate new tokens
    const accessToken = await generateAccessToken(user.id, user.email, c.env.JWT_ACCESS_SECRET);
    const newJti = crypto.randomUUID();
    const newRefreshToken = await generateRefreshToken(
      user.id,
      payload.family_id,
      newJti,
      c.env.JWT_REFRESH_SECRET,
    );

    // Update token family
    await updateTokenFamily(db, payload.family_id, newJti);

    // Set new refresh token in cookie
    setCookie(c, "refresh_token", newRefreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    return c.json({
      access_token: accessToken,
      refresh_token: newRefreshToken,
      expires_in: 15 * 60,
    });
  },
);

// GET /auth/me - Get current user
auth.get(
  "/me",
  describeRoute({
    tags: ["Auth"],
    summary: "Get current user",
    description: "Returns the authenticated user's information",
    security: [{ Bearer: [] }],
    responses: {
      200: {
        description: "User information",
        content: {
          "application/json": {
            schema: resolver(GetMeResponseSchema),
          },
        },
      },
      401: {
        description: "Unauthorized",
        content: {
          "application/json": {
            schema: resolver(ErrorResponseSchema),
          },
        },
      },
    },
  }),
  authMiddleware,
  async (c) => {
    const userId = c.get("userId");

    if (!userId) {
      return c.json(
        {
          success: false as const,
          error: { code: "UNAUTHORIZED", message: "Not authenticated" },
        },
        401,
      );
    }

    const db = createDb(c.env.DB);
    const user = await findUserById(db, userId);

    if (!user) {
      return c.json(
        {
          success: false as const,
          error: { code: "USER_NOT_FOUND", message: "User not found" },
        },
        404,
      );
    }

    return c.json({ user });
  },
);

// POST /auth/logout - Logout user
auth.post(
  "/logout",
  describeRoute({
    tags: ["Auth"],
    summary: "Logout user",
    description: "Invalidates the refresh token and clears cookies",
    security: [{ Bearer: [] }],
    responses: {
      200: {
        description: "Logout successful",
        content: {
          "application/json": {
            schema: resolver(LogoutResponseSchema),
          },
        },
      },
    },
  }),
  authMiddleware,
  async (c) => {
    const refreshToken = getCookie(c, "refresh_token");

    if (refreshToken) {
      const payload = (await verifyJwt(
        refreshToken,
        c.env.JWT_REFRESH_SECRET,
      )) as RefreshTokenPayload | null;

      if (payload) {
        const db = createDb(c.env.DB);
        await revokeTokenFamily(db, payload.family_id);
      }
    }

    deleteCookie(c, "refresh_token");

    return c.json({ success: true as const });
  },
);

export default auth;
