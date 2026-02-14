---
paths:
  - "apps/web/**"
---

# Web Conventions (apps/web)

## Stack

React 19 | TanStack Router + Query | Zustand | Tailwind v4 | Radix UI + CVA | Vite

## API Client

- `api` from `lib/api.ts` — hono/client RPC, auto-typed from API's `AppType`
- Always use `handleResponse<T>(res)` to unwrap responses and throw `ApiError`
- Auth header injected automatically via `useAuthStore.getState().accessToken`

## Routing (TanStack Router)

- Route files export a default function: `(parentRoute: AnyRoute) => createRoute({...})`
- Public routes: `login`, `auth/callback` — children of `rootRoute`
- Authenticated routes: wrapped in `authenticatedLayout` (AuthGuard + BottomNav)
- Route tree assembled in `main.tsx`

## State

- Auth: `useAuthStore` (Zustand + localStorage persist) — `user`, `accessToken`, `isAuthenticated`
- Server state: TanStack Query — `useQuery`/`useMutation`, queryKey conventions: `["entity", params]`

## UI Components

- `components/ui/` — shadcn/ui pattern: CVA variants + Radix primitives + `cn()` from `lib/utils.ts`
- Use existing `Button`, `Input`, `Label`, `Dialog`, `Textarea` before creating new ones
- Styling: Tailwind semantic tokens (`primary`, `secondary`, `muted-foreground`, `destructive`, `border`, `card`)
- Icons: `lucide-react`

## Env

- `@t3-oss/env-core` in `env.ts` — client vars require `VITE_` prefix
- Import as `import { env } from "@/env"`

## Path Alias

- `@/` resolves to `src/`
