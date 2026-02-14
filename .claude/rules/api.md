---
paths:
  - "apps/api/**"
---

# API Conventions (apps/api)

## Naming

- All API response/request fields: **snake_case** (`parent_node`, not `parentNode`)

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

## Architecture

### Layer responsibilities
- **routes/** — HTTP concerns only: parse request, call service, format response. Never write DB queries directly.
- **services/** — Business logic + data access. Receive `Kysely<Database>` via constructor. Own all query logic.
- **schemas/** — Validation and response type definitions. Imported by routes. Must not import routes or services.
- **lib/** — Shared utilities. Stateless. Must not import routes, services, or schemas.
- **middleware/** — Cross-cutting HTTP concerns. May import from lib. Must not import from services.

### Dependency rules
```
routes → services → lib
routes → schemas
routes → middleware → lib
```
Any import that violates these arrows is a design error. Extract shared code into the appropriate lower layer.
