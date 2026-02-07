import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import type { HonoEnv } from "../types/bindings";
import { createDb } from "../lib/db";
import { arktypeQueryValidator } from "../lib/validators";
import { TagService } from "../services/tag";
import { authMiddleware } from "../middleware/auth";
import {
  CreateTagSchema,
  UpdateTagSchema,
  ListTagsQuerySchema,
  TagSuggestQuerySchema,
  TagResponseSchema,
  TagsListResponseSchema,
  CreateTagResponseSchema,
  UpdateTagResponseSchema,
  DeleteTagResponseSchema,
  TagSuggestResponseSchema,
  NodesByTagResponseSchema,
  type CreateTagInput,
  type UpdateTagInput,
  type ListTagsQuery,
  type TagSuggestQuery,
} from "../schemas/tag";
import { ErrorResponseSchema } from "../schemas/auth";

const tags = new Hono<HonoEnv>();

// GET /tags - List all tags
tags.get(
  "/",
  describeRoute({
    tags: ["Tags"],
    summary: "タグ一覧取得",
    description: "すべてのタグを使用回数と共に取得",
    parameters: [
      { name: "search", in: "query", required: false, schema: { type: "string" } },
      { name: "limit", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 100 } },
      { name: "offset", in: "query", required: false, schema: { type: "integer", minimum: 0 } },
    ],
    responses: {
      200: {
        description: "タグ一覧",
        content: {
          "application/json": {
            schema: resolver(TagsListResponseSchema),
          },
        },
      },
    },
  }),
  arktypeQueryValidator(ListTagsQuerySchema),
  async (c) => {
    const query = c.req.valid("query") as ListTagsQuery;
    const db = createDb(c.env.DB);
    const tagService = new TagService(db);

    const tagsList = await tagService.list({
      search: query.search,
      limit: query.limit || 50,
      offset: query.offset || 0,
    });

    return c.json({
      tags: tagsList,
      total: tagsList.length,
    });
  },
);

// GET /tags/popular - Get popular tags
tags.get(
  "/popular",
  describeRoute({
    tags: ["Tags"],
    summary: "人気タグ取得",
    description: "最も使用されているタグを取得",
    responses: {
      200: {
        description: "人気タグ一覧",
        content: {
          "application/json": {
            schema: resolver(TagsListResponseSchema),
          },
        },
      },
    },
  }),
  async (c) => {
    const db = createDb(c.env.DB);
    const tagService = new TagService(db);

    const popularTags = await tagService.getPopularTags(10);

    return c.json({
      tags: popularTags,
      total: popularTags.length,
    });
  },
);

// GET /tags/suggest - Suggest tags based on partial input
tags.get(
  "/suggest",
  describeRoute({
    tags: ["Tags"],
    summary: "タグサジェスト",
    description: "部分入力に基づいてタグ候補を取得",
    parameters: [
      { name: "q", in: "query", required: true, schema: { type: "string", minLength: 1 } },
      { name: "limit", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 10 } },
    ],
    responses: {
      200: {
        description: "タグ候補",
        content: {
          "application/json": {
            schema: resolver(TagSuggestResponseSchema),
          },
        },
      },
    },
  }),
  arktypeQueryValidator(TagSuggestQuerySchema),
  async (c) => {
    const query = c.req.valid("query") as TagSuggestQuery;
    const db = createDb(c.env.DB);
    const tagService = new TagService(db);

    const suggestions = await tagService.suggestTags(query.q, query.limit || 5);

    return c.json({ suggestions });
  },
);

// GET /tags/:id - Get a specific tag
tags.get(
  "/:id",
  describeRoute({
    tags: ["Tags"],
    summary: "タグ詳細取得（ID）",
    description: "IDを指定してタグの詳細情報を取得",
    responses: {
      200: {
        description: "タグ詳細",
        content: {
          "application/json": {
            schema: resolver(TagResponseSchema),
          },
        },
      },
      404: {
        description: "タグが見つかりません",
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
    const tagService = new TagService(db);

    const tag = await tagService.getById(id);

    if (!tag) {
      return c.json(
        {
          success: false as const,
          error: { code: "NOT_FOUND", message: "Tag not found" },
        },
        404,
      );
    }

    return c.json({ tag });
  },
);

// GET /tags/name/:name - Get tag by name
tags.get(
  "/name/:name",
  describeRoute({
    tags: ["Tags"],
    summary: "タグ詳細取得（名前）",
    description: "名前を指定してタグの詳細情報を取得",
    responses: {
      200: {
        description: "タグ詳細",
        content: {
          "application/json": {
            schema: resolver(TagResponseSchema),
          },
        },
      },
      404: {
        description: "タグが見つかりません",
        content: {
          "application/json": {
            schema: resolver(ErrorResponseSchema),
          },
        },
      },
    },
  }),
  async (c) => {
    const name = c.req.param("name");
    const db = createDb(c.env.DB);
    const tagService = new TagService(db);

    const tag = await tagService.getByName(name);

    if (!tag) {
      return c.json(
        {
          success: false as const,
          error: { code: "NOT_FOUND", message: "Tag not found" },
        },
        404,
      );
    }

    return c.json({ tag });
  },
);

// GET /tags/:name/nodes - Get nodes by tag
tags.get(
  "/:name/nodes",
  describeRoute({
    tags: ["Tags"],
    summary: "タグ別ノード取得",
    description: "指定したタグを持つすべてのノードを取得",
    parameters: [
      { name: "limit", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 100 } },
      { name: "offset", in: "query", required: false, schema: { type: "integer", minimum: 0 } },
    ],
    responses: {
      200: {
        description: "タグ付きノード一覧",
        content: {
          "application/json": {
            schema: resolver(NodesByTagResponseSchema),
          },
        },
      },
      404: {
        description: "タグが見つかりません",
        content: {
          "application/json": {
            schema: resolver(ErrorResponseSchema),
          },
        },
      },
    },
  }),
  arktypeQueryValidator(ListTagsQuerySchema),
  async (c) => {
    const name = c.req.param("name");
    const query = c.req.valid("query") as ListTagsQuery;
    const db = createDb(c.env.DB);
    const tagService = new TagService(db);

    // Check if tag exists
    const tag = await tagService.getByName(name);
    if (!tag) {
      return c.json(
        {
          success: false as const,
          error: { code: "NOT_FOUND", message: "Tag not found" },
        },
        404,
      );
    }

    const nodes = await tagService.getNodesByTag(name, {
      limit: query.limit || 20,
      offset: query.offset || 0,
    });

    return c.json({
      nodes,
      total: nodes.length,
    });
  },
);

// POST /tags - Create a new tag
tags.post(
  "/",
  describeRoute({
    tags: ["Tags"],
    summary: "タグ作成",
    description: "新しいタグを作成または既存のタグを返す",
    security: [{ Bearer: [] }],
    responses: {
      201: {
        description: "タグ作成または既存",
        content: {
          "application/json": {
            schema: resolver(CreateTagResponseSchema),
          },
        },
      },
      400: {
        description: "不正なリクエスト",
        content: {
          "application/json": {
            schema: resolver(ErrorResponseSchema),
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
  validator("json", CreateTagSchema),
  async (c) => {
    const body = c.req.valid("json") as CreateTagInput;

    const db = createDb(c.env.DB);
    const tagService = new TagService(db);

    const result = await tagService.create(body.name);

    return c.json(
      {
        id: result.id,
        message: result.created ? "Tag created successfully" : "Tag already exists",
        created: result.created,
      },
      201,
    );
  },
);

// PUT /tags/:id - Update a tag (rename)
tags.put(
  "/:id",
  describeRoute({
    tags: ["Tags"],
    summary: "タグ更新",
    description: "既存のタグ名を変更",
    security: [{ Bearer: [] }],
    responses: {
      200: {
        description: "タグ更新成功",
        content: {
          "application/json": {
            schema: resolver(UpdateTagResponseSchema),
          },
        },
      },
      400: {
        description: "不正なリクエスト（名前が既に存在）",
        content: {
          "application/json": {
            schema: resolver(ErrorResponseSchema),
          },
        },
      },
      404: {
        description: "タグが見つかりません",
        content: {
          "application/json": {
            schema: resolver(ErrorResponseSchema),
          },
        },
      },
    },
  }),
  authMiddleware,
  validator("json", UpdateTagSchema),
  async (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json") as UpdateTagInput;

    const db = createDb(c.env.DB);
    const tagService = new TagService(db);

    // Check if tag exists
    const tag = await tagService.getById(id);
    if (!tag) {
      return c.json(
        {
          success: false as const,
          error: { code: "NOT_FOUND", message: "Tag not found" },
        },
        404,
      );
    }

    try {
      await tagService.rename(id, body.name);
      return c.json({ message: "Tag updated successfully" });
    } catch {
      return c.json(
        {
          success: false as const,
          error: {
            code: "DUPLICATE_NAME",
            message: "Tag with this name already exists",
          },
        },
        400,
      );
    }
  },
);

// DELETE /tags/:id - Delete a tag
tags.delete(
  "/:id",
  describeRoute({
    tags: ["Tags"],
    summary: "タグ削除",
    description: "タグを削除（すべてのノードから除去）",
    security: [{ Bearer: [] }],
    responses: {
      200: {
        description: "タグ削除成功",
        content: {
          "application/json": {
            schema: resolver(DeleteTagResponseSchema),
          },
        },
      },
      404: {
        description: "タグが見つかりません",
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

    const db = createDb(c.env.DB);
    const tagService = new TagService(db);

    // Check if tag exists
    const tag = await tagService.getById(id);
    if (!tag) {
      return c.json(
        {
          success: false as const,
          error: { code: "NOT_FOUND", message: "Tag not found" },
        },
        404,
      );
    }

    await tagService.delete(id);

    return c.json({ message: "Tag deleted successfully" });
  },
);

export default tags;
