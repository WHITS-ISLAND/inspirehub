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
  "tag?": "string",
  "q?": "string",
  "limit?": type("string.numeric.parse").to("1 <= number <= 100"),
  "offset?": type("string.numeric.parse").to("number >= 0"),
});

export type CreateNodeInput = typeof CreateNodeSchema.infer;
export type UpdateNodeInput = typeof UpdateNodeSchema.infer;
export type ListNodesQuery = typeof ListNodesQuerySchema.infer;
