import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { describeRoute, resolver, validator } from "hono-openapi";
import type { HonoEnv } from "../types/bindings";
import { buildGoogleAuthUrl, exchangeCodeForTokens, getGoogleUserInfo } from "../services/google";
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
  GoogleAuthUrlQuerySchema,
  GoogleAuthUrlResponseSchema,
  GoogleCallbackResponseSchema,
  RefreshTokenBodySchema,
  RefreshTokenResponseSchema,
  GetMeResponseSchema,
  LogoutResponseSchema,
  ErrorResponseSchema,
} from "../schemas/auth";

const auth = new Hono<HonoEnv>();

// GET /auth/google - Redirect to Google OAuth
auth.get("/google", (c) => {
  // Build the callback URL for this API server
  const apiOrigin = new URL(c.req.url).origin;
  const redirectUri = `${apiOrigin}/auth/google/callback`;

  // Generate state for CSRF protection
  const state = crypto.randomUUID();

  // Store state in cookie for validation
  setCookie(c, "oauth_state", state, {
    httpOnly: true,
    secure: false, // false for localhost
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
  });

  const params = new URLSearchParams({
    client_id: c.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: state,
    access_type: "offline",
    prompt: "consent",
  });

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return c.redirect(url);
});

// GET /auth/google/url - Get Google OAuth URL
auth.get(
  "/google/url",
  describeRoute({
    tags: ["Auth"],
    summary: "Get Google OAuth URL",
    description: "Returns the URL to redirect user to Google OAuth",
    responses: {
      200: {
        description: "Google OAuth URL",
        content: {
          "application/json": {
            schema: resolver(GoogleAuthUrlResponseSchema),
          },
        },
      },
      400: {
        description: "Bad request",
        content: {
          "application/json": {
            schema: resolver(ErrorResponseSchema),
          },
        },
      },
    },
  }),
  validator("query", GoogleAuthUrlQuerySchema),
  (c) => {
    const query = c.req.valid("query");

    const url = buildGoogleAuthUrl({
      clientId: c.env.GOOGLE_CLIENT_ID,
      redirectUri: query.redirect_uri,
      state: query.state,
      codeChallenge: query.code_challenge,
    });

    return c.json({ url });
  },
);

// GET /auth/google/callback - Exchange code for tokens
auth.get(
  "/google/callback",
  describeRoute({
    tags: ["Auth"],
    summary: "Google OAuth callback",
    description: "Exchange authorization code for tokens",
    responses: {
      200: {
        description: "Authentication successful",
        content: {
          "application/json": {
            schema: resolver(GoogleCallbackResponseSchema),
          },
        },
      },
      400: {
        description: "OAuth failed",
        content: {
          "application/json": {
            schema: resolver(ErrorResponseSchema),
          },
        },
      },
    },
  }),
  async (c) => {
    const code = c.req.query("code");
    const _state = c.req.query("state");

    if (!code) {
      return c.json({ error: "Missing authorization code" }, 400);
    }

    try {
      // Build redirect URI (should match the one used in /google endpoint)
      const redirectUri = `${new URL(c.req.url).origin}/auth/google/callback`;

      // Exchange code for Google tokens (no PKCE for server-side OAuth flow)
      const googleTokens = await exchangeCodeForTokens({
        code,
        redirectUri,
        clientId: c.env.GOOGLE_CLIENT_ID,
        clientSecret: c.env.GOOGLE_CLIENT_SECRET,
      });

      // Get user info from Google
      const googleUser = await getGoogleUserInfo(googleTokens.access_token);

      // Find or create user in D1
      const db = createDb(c.env.DB);
      const user = await findOrCreateUser(db, {
        googleId: googleUser.sub,
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture,
      });

      // Generate JWT tokens
      const accessToken = await generateAccessToken(user.id, user.email, c.env.JWT_ACCESS_SECRET);

      // Create token family for refresh token
      const familyId = crypto.randomUUID();
      const jti = crypto.randomUUID();
      const refreshToken = await generateRefreshToken(
        user.id,
        familyId,
        jti,
        c.env.JWT_REFRESH_SECRET,
      );

      await createTokenFamily(db, user.id, jti);

      // Set tokens in HttpOnly cookies
      setCookie(c, "refresh_token", refreshToken, {
        httpOnly: true,
        secure: false, // false for localhost development
        sameSite: "Lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
      });

      setCookie(c, "access_token", accessToken, {
        httpOnly: true,
        secure: false, // false for localhost development
        sameSite: "Lax",
        path: "/",
        maxAge: 15 * 60, // 15 minutes
      });

      // Redirect to frontend with tokens in URL parameters (temporary for client to store)
      const frontendUrl = c.env.CLIENT_URL || "http://localhost:3000";
      const params = new URLSearchParams({
        access_token: accessToken,
        expires_in: "900", // 15 minutes in seconds
      });
      return c.redirect(`${frontendUrl}/auth/callback?${params.toString()}`);
    } catch (error) {
      console.error("OAuth callback error:", error);
      return c.json(
        {
          success: false as const,
          error: {
            code: "OAUTH_FAILED",
            message: error instanceof Error ? error.message : "OAuth authentication failed",
          },
        },
        400,
      );
    }
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
