import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import type { HonoEnv } from "../types/bindings";
import { createDb } from "../lib/db";
import { CommentService } from "../services/comment";
import { authMiddleware } from "../middleware/auth";
import {
  UpdateCommentSchema,
  CommentResponseSchema,
  UpdateCommentResponseSchema,
  DeleteCommentResponseSchema,
  type UpdateCommentInput,
} from "../schemas/comment";
import { ErrorResponseSchema } from "../schemas/auth";

const comments = new Hono<HonoEnv>()
  .get(
    "/:id",
    describeRoute({
      tags: ["Comments"],
      summary: "コメント詳細取得",
      description: "IDを指定してコメントの詳細情報を取得",
      responses: {
        200: {
          description: "コメント詳細",
          content: {
            "application/json": {
              schema: resolver(CommentResponseSchema),
            },
          },
        },
        404: {
          description: "コメントが見つかりません",
          content: {
            "application/json": {
              schema: resolver(ErrorResponseSchema),
            },
          },
        },
      },
    }),
    async (c) => {
      const id = c.req.param("id");
      const db = createDb(c.env.DB);
      const commentService = new CommentService(db);

      const comment = await commentService.getById(id);

      if (!comment) {
        return c.json(
          {
            success: false as const,
            error: { code: "NOT_FOUND", message: "Comment not found" },
          },
          404,
        );
      }

      return c.json({ comment });
    },
  )
  .put(
    "/:id",
    describeRoute({
      tags: ["Comments"],
      summary: "コメント更新",
      description: "既存のコメントを更新",
      security: [{ Bearer: [] }],
      responses: {
        200: {
          description: "コメント更新成功",
          content: {
            "application/json": {
              schema: resolver(UpdateCommentResponseSchema),
            },
          },
        },
        403: {
          description: "権限がありません",
          content: {
            "application/json": {
              schema: resolver(ErrorResponseSchema),
            },
          },
        },
        404: {
          description: "コメントが見つかりません",
          content: {
            "application/json": {
              schema: resolver(ErrorResponseSchema),
            },
          },
        },
      },
    }),
    authMiddleware,
    validator("json", UpdateCommentSchema),
    async (c) => {
      const id = c.req.param("id");
      const userId = c.get("userId");
      const body = c.req.valid("json") as UpdateCommentInput;

      const db = createDb(c.env.DB);
      const commentService = new CommentService(db);

      const comment = await commentService.getCommentMeta(id);
      if (!comment) {
        return c.json(
          {
            success: false as const,
            error: { code: "NOT_FOUND", message: "Comment not found" },
          },
          404,
        );
      }

      if (comment.author_id !== userId) {
        return c.json(
          {
            success: false as const,
            error: {
              code: "FORBIDDEN",
              message: "You can only edit your own comments",
            },
          },
          403,
        );
      }

      // Extract mentions from content
      let mentionedUserIds = body.mentions;
      if (mentionedUserIds === undefined) {
        mentionedUserIds = await commentService.extractMentions(body.content);
      }

      await commentService.update(id, {
        content: body.content,
        mentions: mentionedUserIds,
      });

      return c.json({ message: "Comment updated successfully" });
    },
  )
  .delete(
    "/:id",
    describeRoute({
      tags: ["Comments"],
      summary: "コメント削除",
      description: "コメントとそのすべてのリプライを削除",
      security: [{ Bearer: [] }],
      responses: {
        200: {
          description: "コメント削除成功",
          content: {
            "application/json": {
              schema: resolver(DeleteCommentResponseSchema),
            },
          },
        },
        403: {
          description: "権限がありません",
          content: {
            "application/json": {
              schema: resolver(ErrorResponseSchema),
            },
          },
        },
        404: {
          description: "コメントが見つかりません",
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
      const id = c.req.param("id");
      const userId = c.get("userId");

      const db = createDb(c.env.DB);
      const commentService = new CommentService(db);

      const comment = await commentService.getCommentMeta(id);
      if (!comment) {
        return c.json(
          {
            success: false as const,
            error: { code: "NOT_FOUND", message: "Comment not found" },
          },
          404,
        );
      }

      if (comment.author_id !== userId) {
        return c.json(
          {
            success: false as const,
            error: {
              code: "FORBIDDEN",
              message: "You can only delete your own comments",
            },
          },
          403,
        );
      }

      await commentService.delete(id);

      return c.json({ message: "Comment deleted successfully" });
    },
  );

export default comments;
