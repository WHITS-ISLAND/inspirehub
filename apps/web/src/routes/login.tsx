import { createRoute, type RootRoute } from "@tanstack/react-router";
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
import { useAuthStore } from "@/stores/auth";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";

function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: "/" });
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-sm space-y-6 p-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">Welcome</h1>
          <p className="text-muted-foreground">Sign in to continue</p>
        </div>
        <GoogleLoginButton />
      </div>
    </div>
  );
}

export default (parentRoute: RootRoute) =>
  createRoute({
    getParentRoute: () => parentRoute,
    path: "/login",
    component: LoginPage,
  });
