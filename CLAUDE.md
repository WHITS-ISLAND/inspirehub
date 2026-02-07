# InspireHub

Monorepo: `apps/api` (Hono on Cloudflare Workers + D1/SQLite via Kysely).

## Git Workflow

- ALWAYS create a feature branch before committing. NEVER commit directly to `develop` or `main`.
- Branch naming: `<type>/<description>` (e.g. `feat/add-oauth`, `fix/login-timeout`)
- NEVER use `git reset --hard` in a command chain. Always verify current branch state first.
- Before pushing, confirm the user hasn't already pushed. Do not assume push is needed.
- Use conventional commit messages: `type(scope): description`
- See skill `pr` for the full PR creation workflow.

## Approach & Focus

- Focus on the specific code task requested. Do NOT explore infrastructure (DB tables, env vars, configs) unless explicitly asked.
- When implementing endpoints or features, ask about naming and placement BEFORE implementing. Do not assume.
- Keep changes minimal and scoped.

## Runtime

Use Bun, not Node.js. `bun test`, `bun run <script>`, `bunx <pkg>`.
`bun run lint` includes type checking — do NOT add a separate `tsc` step.

## Verification commands

```sh
bun run lint    # oxlint --type-aware --type-check (includes type checking)
bun test        # all tests
```

IMPORTANT: Run lint + tests after any code change before reporting completion.

## Code style

- snake_case for all API request/response fields (`parent_node`, not `parentNode`)
- Test names in English, no regression references in code
- Minimal comments — only where logic is non-obvious
- Colocate test files with source (`foo.test.ts` next to `foo.ts`)

## API development

See skill `api-conventions` for detailed rules on pagination, response schemas, and arktype + hono-openapi gotchas.
