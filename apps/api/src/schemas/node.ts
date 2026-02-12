import { type } from "arktype";

export const NodeType = type("'issue' | 'idea' | 'project'");

export const CreateNodeSchema = type({
  type: NodeType,
  title: "string > 0",
  content: "string",
  "tags?": "string[]",
  "parent_node_id?": "string",
});

export const UpdateNodeSchema = type({
  "title?": "string > 0",
  "content?": "string",
  "tags?": "string[]",
});

export const ListNodesQuerySchema = type({
  "type?": NodeType,
  "author_id?": "string",
  "parent_node_id?": "string",
  "tag?": "string",
  "q?": "string",
  "sort?": "'recent' | 'popular'",
  "limit?": type("string.numeric.parse").to("1 <= number <= 100"),
  "offset?": type("string.numeric.parse").to("number >= 0"),
});

// Response schemas
export const ReactionStatusSchema = type({
  count: "number",
  "is_reacted?": "boolean",
});

export const ReactionsSchema = type({
  like: ReactionStatusSchema,
  interested: ReactionStatusSchema,
  want_to_try: ReactionStatusSchema,
});

export const ParentNodeSchema = type({
  id: "string",
  type: NodeType,
  title: "string",
});

export const NodeResponseSchema = type({
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
  reactions: ReactionsSchema,
  comment_count: "number",
  "parent_node?": ParentNodeSchema.or("null"),
});

export const CreateNodeResponseSchema = type({
  id: "string",
  message: "string",
});

export const ListNodesResponseSchema = type({
  nodes: type([NodeResponseSchema]),
  total: "number",
});

export const ReactionToggleResponseSchema = type({
  is_reacted: "boolean",
  count: "number",
});

export type CreateNodeInput = typeof CreateNodeSchema.infer;
export type UpdateNodeInput = typeof UpdateNodeSchema.infer;
export type ListNodesQuery = typeof ListNodesQuerySchema.infer;
