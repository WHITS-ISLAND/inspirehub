---
name: api-conventions
description: REST API design conventions, pagination rules, and arktype + hono-openapi gotchas for apps/api
---

# API Conventions (apps/api)

## Naming

- All API response fields: **snake_case** (`parent_node`, not `parentNode`)
- Request body fields: snake_case (`parent_node_id`, not `parentNodeId`)

## Pagination

- Service layer returns `{ data: T[], total: number }`
- `total` = count of all matching records (separate `COUNT(*)` query), NOT array length
- Route handler destructures: `const { data, total } = await service.list(...)`

## Response consistency

- Same entity type = same response shape, regardless of endpoint
- If multiple services return nodes, include the same fields (content, tags, reactions, parent_node, comment_count)
- Prefer delegating to an existing service method over reimplementing query logic

## Response schemas

- Centralize response schemas in `schemas/<entity>.ts` (e.g. `schemas/node.ts`)
- Route files import schemas; never define them locally

## arktype + hono-openapi

- arktype morph types (e.g. `type("string.numeric.parse")`) **cannot** be serialized to JSON Schema by `resolver()`
- Query params with morph types: use `arktypeQueryValidator()` from `lib/validators.ts` (runtime-only) + define OpenAPI parameters manually in `describeRoute({ parameters: [...] })`
- JSON body schemas without morphs: `validator("json", Schema)` from hono-openapi works fine

## Service layer

- Avoid N+1 queries: use batch methods with `WHERE IN` + `GROUP BY` for related data
- Reaction counts, tags, parent nodes should be fetched in batch (see `NodeService.enrichNodes`)
