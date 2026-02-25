# InspireHub

AI-powered idea management and brainstorming platform. Turborepo monorepo with two apps:

- **`apps/api`** — Hono on Cloudflare Workers + D1/SQLite via Kysely
- **`apps/web`** — React 19 SPA on Cloudflare Pages

## Repository structure

```
inspirehub/
├── apps/
│   ├── api/                 # Cloudflare Workers API
│   │   ├── src/
│   │   │   ├── index.tsx    # Entry point, route registration
│   │   │   ├── routes/      # HTTP handlers (auth, nodes, comments, tags, users)
│   │   │   ├── services/    # Business logic (node, comment, tag, user, token, google-auth)
│   │   │   ├── schemas/     # arktype validation schemas (auth, node, comment, tag)
│   │   │   ├── lib/         # Shared utilities (db, jwt, validators)
│   │   │   ├── middleware/   # auth, cors
│   │   │   ├── notifications/ # Slack notifications, scheduled jobs
│   │   │   ├── types/       # CloudflareBindings, HonoEnv
│   │   │   └── test/        # Test helpers (mock-env)
│   │   ├── migrations/      # Atlas/D1 SQL migrations
│   │   ├── schema.sql       # Full database schema (source of truth)
│   │   └── wrangler.jsonc   # Cloudflare Workers config
│   │
│   └── web/                 # React SPA
│       └── src/
│           ├── main.tsx      # Route tree, providers
│           ├── routes/       # Page components (home, discover, login, profile, nodes/)
│           ├── components/   # UI components (auth/, nodes/, ui/)
│           ├── hooks/        # TanStack Query wrappers, custom hooks
│           ├── stores/       # Zustand stores (auth)
│           ├── lib/          # API client, utilities
│           └── integrations/ # TanStack Query provider
│
├── infrastructure/terraform/ # Terraform configs (develop environment)
├── docs/                    # Auth flow documentation
├── .claude/                 # Claude rules and skills
│   ├── rules/api.md         # Auto-loaded for apps/api/ paths
│   ├── rules/web.md         # Auto-loaded for apps/web/ paths
│   ├── hooks/               # Lint hook on file edit
│   └── skills/pr/           # PR creation workflow
└── .github/workflows/       # CI/CD (pr-checks, deploy-api, deploy-web, terraform)
```

## Git Workflow

- ALWAYS create a feature branch before committing. NEVER commit directly to `develop` or `main`.
- Branch naming: `<type>/<description>` (e.g. `feat/add-oauth`, `fix/login-timeout`)
- NEVER use `git reset --hard` in a command chain. Always verify current branch state first.
- Before pushing, confirm the user hasn't already pushed. Do not assume push is needed.
- Use conventional commit messages: `type(scope): description`
- PRs target `develop` branch. See skill `pr` for the full PR creation workflow.
- CI runs on PRs to `develop`: lint, format check, security audit, build, tests, migration check.

## Approach & Focus

- Focus on the specific code task requested. Do NOT explore infrastructure (DB tables, env vars, configs) unless explicitly asked.
- When implementing endpoints or features, ask about naming and placement BEFORE implementing. Do not assume.
- Keep changes minimal and scoped.

## Architecture principles

- **Dependency direction**: Dependencies flow inward. routes→services→lib, components→hooks→lib. A reverse dependency is a design error.
- **No circular imports**: If A imports B, B must not import A (directly or transitively). Extract shared types/functions into a third module.
- **Separate pure logic**: Business logic that does not require I/O (HTTP, DB, DOM) should be extracted as pure functions, testable without infrastructure mocks.
- **Constructor injection at I/O boundaries**: Classes that perform I/O receive dependencies via constructor. Inject rather than import globals to ensure testability.

## Tech stack

| Layer | API (`apps/api`) | Web (`apps/web`) |
|-------|-------------------|-------------------|
| Framework | Hono 4.12 | React 19 |
| Runtime | Cloudflare Workers | Cloudflare Pages |
| Database | D1 (SQLite) via Kysely | — |
| Validation | arktype 2.x | Zod 4.x |
| Auth | Google OAuth → JWT (HS256) | @react-oauth/google + Zustand |
| Routing | Hono routes + OpenAPI | TanStack Router |
| State | — | TanStack Query + Zustand |
| UI | — | Tailwind v4 + Radix UI + shadcn/ui |
| API docs | Scalar UI at `/docs` | — |
| Testing | bun test | vitest + @testing-library/react |
| Linting | oxlint (type-aware) | oxlint (type-aware) |
| Formatting | oxfmt | oxfmt |

## Runtime

Use Bun, not Node.js. `bun test`, `bun run <script>`, `bunx <pkg>`.
`bun run lint` includes type checking — do NOT add a separate `tsc` step.

## Verification commands

```sh
bun run lint    # oxlint --type-aware --type-check (includes type checking)
bun test        # all tests
```

IMPORTANT: Run lint + tests after any code change before reporting completion.

Per-app commands (run from respective `apps/` directory):

```sh
# API
cd apps/api && bun run lint && bun test

# Web
cd apps/web && bun run lint && bun run test
```

## Code style

- snake_case for all API request/response fields (`parent_node`, not `parentNode`)
- Test names in Japanese, no regression references in code
- Minimal comments — only where logic is non-obvious
- Colocate test files with source (`foo.test.ts` next to `foo.ts`)

## Testing philosophy

- Follow TDD with the Red → Green → Refactor cycle: write a failing test first, implement the minimum code to pass it, then refactor.
- Structure each test as Arrange → Act → Assert.
- Each test case name must be a unique, self-contained behavioral specification — when listed together, the names alone should describe the system's behavior.
- Tests are the single source of truth. Natural-language documentation follows them, not the other way around.
- After writing or modifying tests, review that each test case name accurately matches what the test body verifies. If they diverge, determine which is correct and fix the other.

## Database

- **Engine**: Cloudflare D1 (SQLite) accessed via Kysely query builder
- **Schema source of truth**: `apps/api/schema.sql`
- **Migrations**: Atlas-managed in `apps/api/migrations/`, applied via `wrangler d1 migrations apply`
- **Tables**: users, refresh_token_families, nodes, edges, tags, node_tags, comments, comment_mentions, likes, interested, want_to_try
- **Node types**: `issue`, `idea`, `project` (CHECK constraint)
- **Reactions**: Three separate tables (likes, interested, want_to_try) — each with composite PK `(node_id, user_id)`
- **Comments**: Self-referencing `parent_id` for nested threading
- **IDs**: TEXT primary keys (UUIDs)

### Migration workflow

```sh
cd apps/api
# Generate migration from schema.sql changes:
bun run db:diff
# Apply locally:
bun run db:apply
# Apply remote (via CI or manually):
wrangler d1 migrations apply DB --remote
```

## API development

Rules auto-loaded from `.claude/rules/api.md` when working in `apps/api/`.

Key conventions:
- Services receive `Kysely<Database>` via constructor injection
- Response shape: `{ data: T[], total: number }` for all list endpoints
- Batch-fetch related data to avoid N+1 (see `NodeService.enrichNodes`)
- arktype morph types cannot be serialized to OpenAPI — use `arktypeQueryValidator()` + manual `describeRoute({ parameters })` for query params
- Validation schemas live in `src/schemas/`, never inline in routes
- API layer structure: `routes → services → lib`, `routes → schemas`, `routes → middleware → lib`

## Web development

Rules auto-loaded from `.claude/rules/web.md` when working in `apps/web/`.

Key conventions:
- API client: `hono/client` RPC (`lib/api.ts`), typed from API's `AppType`
- Components never import `lib/api` directly — always go through hooks
- Auth state: `useAuthStore` (Zustand + localStorage persistence)
- Path alias: `@/` → `src/`
- Env vars: `@t3-oss/env-core`, client vars require `VITE_` prefix
- Web layer structure: `components → hooks → lib/api`, `components → stores`, `hooks → stores (read-only via getState())`

## Deployment

- **API**: Cloudflare Workers — auto-deploys on push to `develop` (`.github/workflows/deploy-api.yml`)
- **Web**: Cloudflare Pages — auto-deploys on push to `develop` (`.github/workflows/deploy-web.yml`)
- **Infrastructure**: Terraform in `infrastructure/terraform/` — managed via `.github/workflows/terraform.yml`
- **Secrets**: Managed via `wrangler secret put` (API) and GitHub Actions secrets (CI)

## Local development

```sh
bun install                          # Install all dependencies
bun run dev                          # Start all services via Turborepo
# Or individually:
cd apps/api && bun run dev           # API at http://localhost:8787
cd apps/web && bun run dev           # Web at http://localhost:3000
```

API secrets go in `apps/api/.dev.vars` (not committed). Web env in `apps/web/.env`.
