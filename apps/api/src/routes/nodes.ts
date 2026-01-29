import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import type { HonoEnv } from "../types/bindings";
import { createDb } from "../lib/db";
import { NodeService } from "../services/node";
import { CommentService } from "../services/comment";
import { authMiddleware } from "../middleware/auth";
import {
  CreateNodeSchema,
  UpdateNodeSchema,
  ListNodesQuerySchema,
  type CreateNodeInput,
  type UpdateNodeInput,
  type ListNodesQuery,
} from "../schemas/node";
import {
  CreateCommentSchema,
  ListCommentsQuerySchema,
  CommentsListResponseSchema,
  CreateCommentResponseSchema,
  type CreateCommentInput,
  type ListCommentsQuery,
} from "../schemas/comment";
import { ErrorResponseSchema } from "../schemas/auth";
import { type } from "arktype";

// Response schemas
const NodeResponseSchema = type({
  id: "string",
  type: "'issue' | 'idea' | 'project'",
  title: "string",
  content: "string",
  author_id: "string",
  author_name: "string | null",
  author_picture: "string | null",
  created_at: "string",
  updated_at: "string",
  tags: type([
    {
      id: "string",
      name: "string",
    },
  ]),
  like_count: "number",
  comment_count: "number",
  "is_liked?": "boolean",
});

const CreateNodeResponseSchema = type({
  id: "string",
  message: "string",
});

const ListNodesResponseSchema = type({
  nodes: type([NodeResponseSchema]),
  total: "number",
});

const LikeResponseSchema = type({
  liked: "boolean",
  like_count: "number",
});

const nodes = new Hono<HonoEnv>();

// GET /nodes - List nodes
nodes.get(
  "/",
  describeRoute({
    tags: ["Nodes"],
    summary: "ノード一覧取得",
    description: "ノードの一覧を取得（フィルタオプション付き）",
    responses: {
      200: {
        description: "ノード一覧",
        content: {
          "application/json": {
            schema: resolver(ListNodesResponseSchema),
          },
        },
      },
    },
  }),
  validator("query", ListNodesQuerySchema),
  async (c) => {
    const query = c.req.valid("query") as ListNodesQuery;
    const db = createDb(c.env.DB);
    const nodeService = new NodeService(db);

    const nodesList = await nodeService.list({
      type: query.type,
      author_id: query.author_id,
      tag: query.tag,
      limit: query.limit || 20,
      offset: query.offset || 0,
    });

    // Get user's like status if authenticated
    const authHeader = c.req.header("Authorization");
    let likeStatuses: Record<string, boolean> = {};

    if (authHeader) {
      try {
        const userId = c.get("userId");
        if (userId) {
          const nodeIds = nodesList.map((n) => n.id);
          likeStatuses = await nodeService.getUserLikeStatus(nodeIds, userId);
        }
      } catch {
        // Optional auth, ignore errors
      }
    }

    const nodesWithLikeStatus = nodesList.map((node) => ({
      ...node,
      is_liked: likeStatuses[node.id] || false,
    }));

    return c.json({
      nodes: nodesWithLikeStatus,
      total: nodesWithLikeStatus.length,
    });
  }
);

// GET /nodes/:id - Get a specific node
nodes.get(
  "/:id",
  describeRoute({
    tags: ["Nodes"],
    summary: "ノード詳細取得",
    description: "IDを指定してノードの詳細情報を取得",
    responses: {
      200: {
        description: "ノード詳細",
        content: {
          "application/json": {
            schema: resolver(NodeResponseSchema),
          },
        },
      },
      404: {
        description: "ノードが見つかりません",
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
    const nodeService = new NodeService(db);

    const node = await nodeService.getById(id);

    if (!node) {
      return c.json(
        {
          success: false as const,
          error: { code: "NOT_FOUND", message: "Node not found" },
        },
        404
      );
    }

    // Check if user has liked this node
    let isLiked = false;
    const authHeader = c.req.header("Authorization");
    if (authHeader) {
      try {
        const userId = c.get("userId");
        if (userId) {
          const likeStatuses = await nodeService.getUserLikeStatus(
            [id],
            userId
          );
          isLiked = likeStatuses[id] || false;
        }
      } catch {
        // Optional auth, ignore errors
      }
    }

    return c.json({
      ...node,
      is_liked: isLiked,
    });
  }
);

// POST /nodes - Create a new node
nodes.post(
  "/",
  describeRoute({
    tags: ["Nodes"],
    summary: "ノード作成",
    description: "新しいノード（issue、idea、project）を作成",
    security: [{ Bearer: [] }],
    responses: {
      201: {
        description: "ノード作成成功",
        content: {
          "application/json": {
            schema: resolver(CreateNodeResponseSchema),
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
  validator("json", CreateNodeSchema),
  async (c) => {
    const userId = c.get("userId");
    const body = c.req.valid("json") as CreateNodeInput;

    const db = createDb(c.env.DB);
    const nodeService = new NodeService(db);

    const nodeId = await nodeService.create({
      ...body,
      author_id: userId,
    });

    return c.json(
      {
        id: nodeId,
        message: "Node created successfully",
      },
      201
    );
  }
);

// PUT /nodes/:id - Update a node
nodes.put(
  "/:id",
  describeRoute({
    tags: ["Nodes"],
    summary: "ノード更新",
    description: "既存のノードを更新",
    security: [{ Bearer: [] }],
    responses: {
      200: {
        description: "ノード更新成功",
        content: {
          "application/json": {
            schema: type({ message: "string" }),
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
        description: "ノードが見つかりません",
        content: {
          "application/json": {
            schema: resolver(ErrorResponseSchema),
          },
        },
      },
    },
  }),
  authMiddleware,
  validator("json", UpdateNodeSchema),
  async (c) => {
    const id = c.req.param("id");
    const userId = c.get("userId");
    const body = c.req.valid("json") as UpdateNodeInput;

    const db = createDb(c.env.DB);
    const nodeService = new NodeService(db);

    // Check if node exists and user is the author
    const node = await nodeService.getById(id);
    if (!node) {
      return c.json(
        {
          success: false as const,
          error: { code: "NOT_FOUND", message: "Node not found" },
        },
        404
      );
    }

    if (node.author_id !== userId) {
      return c.json(
        {
          success: false as const,
          error: {
            code: "FORBIDDEN",
            message: "You can only edit your own nodes",
          },
        },
        403
      );
    }

    await nodeService.update(id, body);

    return c.json({ message: "Node updated successfully" });
  }
);

// DELETE /nodes/:id - Delete a node
nodes.delete(
  "/:id",
  describeRoute({
    tags: ["Nodes"],
    summary: "ノード削除",
    description: "ノードを削除",
    security: [{ Bearer: [] }],
    responses: {
      200: {
        description: "ノード削除成功",
        content: {
          "application/json": {
            schema: type({ message: "string" }),
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
        description: "ノードが見つかりません",
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
    const nodeService = new NodeService(db);

    // Check if node exists and user is the author
    const node = await nodeService.getById(id);
    if (!node) {
      return c.json(
        {
          success: false as const,
          error: { code: "NOT_FOUND", message: "Node not found" },
        },
        404
      );
    }

    if (node.author_id !== userId) {
      return c.json(
        {
          success: false as const,
          error: {
            code: "FORBIDDEN",
            message: "You can only delete your own nodes",
          },
        },
        403
      );
    }

    await nodeService.delete(id);

    return c.json({ message: "Node deleted successfully" });
  }
);

// POST /nodes/:id/like - Toggle like on a node
nodes.post(
  "/:id/like",
  describeRoute({
    tags: ["Nodes"],
    summary: "いいね切り替え",
    description: "ノードのいいね状態を切り替え",
    security: [{ Bearer: [] }],
    responses: {
      200: {
        description: "いいね切り替え成功",
        content: {
          "application/json": {
            schema: resolver(LikeResponseSchema),
          },
        },
      },
      404: {
        description: "ノードが見つかりません",
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
    const nodeId = c.req.param("id");
    const userId = c.get("userId");

    const db = createDb(c.env.DB);
    const nodeService = new NodeService(db);

    // Check if node exists
    const node = await nodeService.getById(nodeId);
    if (!node) {
      return c.json(
        {
          success: false as const,
          error: { code: "NOT_FOUND", message: "Node not found" },
        },
        404
      );
    }

    const result = await nodeService.toggleLike(nodeId, userId);

    // Get updated like count
    const updatedNode = await nodeService.getById(nodeId);

    return c.json({
      liked: result.liked,
      like_count: updatedNode?.like_count || 0,
    });
  }
);

// GET /nodes/:nodeId/comments - List comments for a node
nodes.get(
  "/:nodeId/comments",
  describeRoute({
    tags: ["Comments"],
    summary: "コメント一覧取得",
    description: "指定したノードのコメントをネストされたリプライと共に取得",
    responses: {
      200: {
        description: "コメント一覧",
        content: {
          "application/json": {
            schema: resolver(CommentsListResponseSchema),
          },
        },
      },
      404: {
        description: "ノードが見つかりません",
        content: {
          "application/json": {
            schema: resolver(ErrorResponseSchema),
          },
        },
      },
    },
  }),
  validator("query", ListCommentsQuerySchema),
  async (c) => {
    const nodeId = c.req.param("nodeId");
    const query = c.req.valid("query") as ListCommentsQuery;

    const db = createDb(c.env.DB);
    const nodeService = new NodeService(db);
    const commentService = new CommentService(db);

    // Check if node exists
    const node = await nodeService.getById(nodeId);
    if (!node) {
      return c.json(
        {
          success: false as const,
          error: { code: "NOT_FOUND", message: "Node not found" },
        },
        404
      );
    }

    const commentsList = await commentService.getByNodeId(nodeId, {
      limit: query.limit || 50,
      offset: query.offset || 0,
    });

    return c.json({
      comments: commentsList,
      total: commentsList.length,
    });
  }
);

// POST /nodes/:nodeId/comments - Create a new comment
nodes.post(
  "/:nodeId/comments",
  describeRoute({
    tags: ["Comments"],
    summary: "コメント作成",
    description: "ノードに新しいコメントを作成、または既存のコメントにリプライ",
    security: [{ Bearer: [] }],
    responses: {
      201: {
        description: "コメント作成成功",
        content: {
          "application/json": {
            schema: resolver(CreateCommentResponseSchema),
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
      404: {
        description: "ノードまたは親コメントが見つかりません",
        content: {
          "application/json": {
            schema: resolver(ErrorResponseSchema),
          },
        },
      },
    },
  }),
  authMiddleware,
  validator("json", CreateCommentSchema),
  async (c) => {
    const nodeId = c.req.param("nodeId");
    const userId = c.get("userId");
    const body = c.req.valid("json") as CreateCommentInput;

    const db = createDb(c.env.DB);
    const nodeService = new NodeService(db);
    const commentService = new CommentService(db);

    // Check if node exists
    const node = await nodeService.getById(nodeId);
    if (!node) {
      return c.json(
        {
          success: false as const,
          error: { code: "NOT_FOUND", message: "Node not found" },
        },
        404
      );
    }

    // Check if parent comment exists (if replying)
    if (body.parent_id) {
      const parentComment = await commentService.getById(body.parent_id);
      if (!parentComment || parentComment.node_id !== nodeId) {
        return c.json(
          {
            success: false as const,
            error: { code: "NOT_FOUND", message: "Parent comment not found" },
          },
          404
        );
      }
    }

    // Extract mentions from content
    let mentionedUserIds = body.mentions || [];
    if (!mentionedUserIds.length) {
      mentionedUserIds = await commentService.extractMentions(body.content);
    }

    const commentId = await commentService.create({
      node_id: nodeId,
      parent_id: body.parent_id,
      author_id: userId,
      content: body.content,
      mentions: mentionedUserIds,
    });

    return c.json(
      {
        id: commentId,
        message: "Comment created successfully",
      },
      201
    );
  }
);

export default nodes;