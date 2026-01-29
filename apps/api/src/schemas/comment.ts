import { type } from "arktype";

export const CreateCommentSchema = type({
  content: "string > 0",
  "parent_id?": "string | null",
  "mentions?": "string[]",
});

export const UpdateCommentSchema = type({
  content: "string > 0",
  "mentions?": "string[]",
});

export const ListCommentsQuerySchema = type({
  "limit?": "number >= 1 <= 100",
  "offset?": "number >= 0",
});

// Response schemas for OpenAPI
export const MentionSchema = type({
  id: "string",
  name: "string",
  "picture?": "string | null",
});

export const CommentSchema = type({
  id: "string",
  node_id: "string",
  "parent_id": "string | null",
  author_id: "string",
  "author_name": "string | null",
  "author_picture": "string | null",
  content: "string",
  created_at: "string",
  updated_at: "string",
  mentions: type([MentionSchema]),
  "replies?": "unknown[]", // Recursive type, will be CommentSchema[]
});

export const CommentResponseSchema = type({
  comment: CommentSchema,
});

export const CommentsListResponseSchema = type({
  comments: type([CommentSchema]),
  total: "number",
});

export const CreateCommentResponseSchema = type({
  id: "string",
  message: "string",
});

export const UpdateCommentResponseSchema = type({
  message: "string",
});

export const DeleteCommentResponseSchema = type({
  message: "string",
});

export type CreateCommentInput = typeof CreateCommentSchema.infer;
export type UpdateCommentInput = typeof UpdateCommentSchema.infer;
export type ListCommentsQuery = typeof ListCommentsQuerySchema.infer;