import { useEffect, useState } from "react";
import { createRoute, useNavigate, type AnyRootRoute } from "@tanstack/react-router";
import { useAuthStore } from "@/stores/auth";

function AuthCallbackPage() {
  const navigate = useNavigate();
  const { setError } = useAuthStore();
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // This callback page is deprecated.
    // Authentication now happens via Google Sign-In SDK directly.
    // Redirect to login page.
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");

    if (error) {
      setStatus("error");
      setErrorMessage(`Authentication failed: ${error}`);
      setError(error);
      return;
    }

    // Redirect to home
    void navigate({ to: "/" });
  }, [navigate, setError]);

  if (status === "error") {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-red-600">Authentication Failed</h1>
          <p className="text-muted-foreground">{errorMessage}</p>
          <button
            onClick={() => navigate({ to: "/login" })}
            className="text-blue-600 hover:underline"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="text-center">
        <p>Completing sign in...</p>
      </div>
    </div>
  );
}

export default (parentRoute: AnyRootRoute) =>
  createRoute({
    getParentRoute: () => parentRoute,
    path: "/auth/callback",
    component: AuthCallbackPage,
  });
