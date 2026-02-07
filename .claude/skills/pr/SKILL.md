---
name: pr
description: Create a PR with proper branch, commits, and push workflow
disable-model-invocation: true
---

Create a PR for the current changes: $ARGUMENTS

Follow this workflow strictly:

1. **Check branch state**: Run `git branch --show-current` and `git status`
2. **Create feature branch if needed**: If on `develop` or `main`, create a branch: `git checkout -b <type>/<description>`
   - Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`
3. **Stage and review**: Stage relevant files (not `.env` or credentials). Show a diff summary for user approval.
4. **Commit**: Use conventional commit message format `type(scope): description`. Confirm with user first.
5. **Verify**: Run `bun run lint && bun test`. Fix any failures before proceeding.
6. **Push**: `git push -u origin <branch>`. NEVER force push without explicit permission.
7. **Create PR**: `gh pr create --base develop` with a clear title and description.

Rules:
- NEVER use `git reset --hard`
- NEVER commit directly to `develop` or `main`
- If any step fails, STOP and explain — do not attempt workarounds that could lose work
