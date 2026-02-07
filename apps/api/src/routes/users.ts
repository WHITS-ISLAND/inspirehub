import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import type { HonoEnv } from "../types/bindings";
import { updateUserName } from "../services/user";
import { createDb } from "../lib/db";
import { authMiddleware } from "../middleware/auth";
import { UpdateMeBodySchema, UpdateMeResponseSchema, ErrorResponseSchema } from "../schemas/auth";

const users = new Hono<HonoEnv>();

// PATCH /users/me - Update current user name
users.patch(
  "/me",
  describeRoute({
    tags: ["Users"],
    summary: "ユーザー名更新",
    description: "認証済みユーザーの表示名を更新",
    security: [{ Bearer: [] }],
    responses: {
      200: {
        description: "更新成功",
        content: {
          "application/json": {
            schema: resolver(UpdateMeResponseSchema),
          },
        },
      },
      401: {
        description: "認証エラー",
        content: {
          "application/json": {
            schema: resolver(ErrorResponseSchema),
          },
        },
      },
    },
  }),
  authMiddleware,
  validator("json", UpdateMeBodySchema),
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

    const { name } = c.req.valid("json");
    const db = createDb(c.env.DB);
    const user = await updateUserName(db, userId, name);

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

export default users;
