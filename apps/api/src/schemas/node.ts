import { type } from "arktype";

export const NodeType = type("'issue' | 'idea' | 'project'");

export const CreateNodeSchema = type({
  type: NodeType,
  title: "string > 0",
  content: "string",
  "tags?": "string[]",
});

export const UpdateNodeSchema = type({
  "title?": "string > 0",
  "content?": "string",
  "tags?": "string[]",
});

export const ListNodesQuerySchema = type({
  "type?": NodeType,
  "author_id?": "string",
  "tag?": "string",
  "limit?": "number >= 1 <= 100",
  "offset?": "number >= 0",
});

export type CreateNodeInput = typeof CreateNodeSchema.infer;
export type UpdateNodeInput = typeof UpdateNodeSchema.infer;
export type ListNodesQuery = typeof ListNodesQuerySchema.infer;