import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  useMatchRoute,
} from "@tanstack/react-router";
import { lazy } from "react";

const TanStackRouterDevtools = import.meta.env.DEV
  ? lazy(() =>
      import("@tanstack/react-router-devtools").then((m) => ({
        default: m.TanStackRouterDevtools,
      })),
    )
  : () => null;
import { GoogleOAuthProvider } from "@react-oauth/google";

import Header from "./components/Header";
import { BottomNav } from "./components/BottomNav";
import { AuthGuard } from "./components/auth/AuthGuard";

import LoginRoute from "./routes/login";
import HomeRoute from "./routes/home";
import NodeDetailRoute from "./routes/nodes/detail";
import NodeCreateRoute from "./routes/nodes/new";
import DiscoverRoute from "./routes/discover";
import ProfileRoute from "./routes/profile";

import * as TanStackQueryProvider from "./integrations/tanstack-query/root-provider";

import "./styles.css";
import { env } from "./env";

function RootComponent() {
  const matchRoute = useMatchRoute();
  const isLogin = matchRoute({ to: "/login" });

  return (
    <>
      {!isLogin && <Header />}
      <Outlet />
      <TanStackRouterDevtools />
    </>
  );
}

const rootRoute = createRootRoute({
  component: RootComponent,
});

const authenticatedLayout = createRoute({
  getParentRoute: () => rootRoute,
  id: "authenticated",
  component: () => (
    <AuthGuard>
      <main className="mx-auto max-w-5xl pb-20 md:pb-4">
        <Outlet />
      </main>
      <BottomNav />
    </AuthGuard>
  ),
});

const routeTree = rootRoute.addChildren([
  LoginRoute(rootRoute),
  authenticatedLayout.addChildren([
    HomeRoute(authenticatedLayout),
    NodeDetailRoute(authenticatedLayout),
    NodeCreateRoute(authenticatedLayout),
    DiscoverRoute(authenticatedLayout),
    ProfileRoute(authenticatedLayout),
  ]),
]);

const TanStackQueryProviderContext = TanStackQueryProvider.getContext();
const router = createRouter({
  routeTree,
  context: {
    ...TanStackQueryProviderContext,
  },
  defaultPreload: "intent",
  scrollRestoration: true,
  defaultStructuralSharing: true,
  defaultPreloadStaleTime: 0,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("app");
if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <GoogleOAuthProvider clientId={env.VITE_GOOGLE_CLIENT_ID}>
        <TanStackQueryProvider.Provider {...TanStackQueryProviderContext}>
          <RouterProvider router={router} />
        </TanStackQueryProvider.Provider>
      </GoogleOAuthProvider>
    </StrictMode>,
  );
}
