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

## Architecture principles

- **Dependency direction**: Dependencies flow inward. routes→services→lib, components→hooks→lib. A reverse dependency is a design error.
- **No circular imports**: If A imports B, B must not import A (directly or transitively). Extract shared types/functions into a third module.
- **Separate pure logic**: Business logic that does not require I/O (HTTP, DB, DOM) should be extracted as pure functions, testable without infrastructure mocks.
- **Constructor injection at I/O boundaries**: Classes that perform I/O receive dependencies via constructor. Inject rather than import globals to ensure testability.

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
- Test names in Japanese, no regression references in code
- Minimal comments — only where logic is non-obvious
- Colocate test files with source (`foo.test.ts` next to `foo.ts`)

## Testing philosophy

- Follow TDD with the Red → Green → Refactor cycle: write a failing test first, implement the minimum code to pass it, then refactor.
- Structure each test as Arrange → Act → Assert.
- Each test case name must be a unique, self-contained behavioral specification — when listed together, the names alone should describe the system's behavior.
- Tests are the single source of truth. Natural-language documentation follows them, not the other way around.
- After writing or modifying tests, review that each test case name accurately matches what the test body verifies. If they diverge, determine which is correct and fix the other.

## API development

Rules auto-loaded from `.claude/rules/api.md` when working in `apps/api/`.
