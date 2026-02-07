import { type } from "arktype";

export const CreateTagSchema = type({
  name: "string > 0",
});

export const UpdateTagSchema = type({
  name: "string > 0",
});

export const ListTagsQuerySchema = type({
  "search?": "string",
  "limit?": type("string.numeric.parse").to("1 <= number <= 100"),
  "offset?": type("string.numeric.parse").to("number >= 0"),
});

export const TagSuggestQuerySchema = type({
  q: "string > 0",
  "limit?": type("string.numeric.parse").to("1 <= number <= 10"),
});

// Response schemas for OpenAPI
export const TagSchema = type({
  id: "string",
  name: "string",
  created_at: "string",
  "usage_count?": "number",
});

export const TagResponseSchema = type({
  tag: TagSchema,
});

export const TagsListResponseSchema = type({
  tags: type([TagSchema]),
  total: "number",
});

export const CreateTagResponseSchema = type({
  id: "string",
  message: "string",
  created: "boolean",
});

export const UpdateTagResponseSchema = type({
  message: "string",
});

export const DeleteTagResponseSchema = type({
  message: "string",
});

export const TagSuggestResponseSchema = type({
  suggestions: type([
    {
      id: "string",
      name: "string",
    },
  ]),
});

export type CreateTagInput = typeof CreateTagSchema.infer;
export type UpdateTagInput = typeof UpdateTagSchema.infer;
export type ListTagsQuery = typeof ListTagsQuerySchema.infer;
export type TagSuggestQuery = typeof TagSuggestQuerySchema.infer;
