import { useEffect, useState } from "react";
import { createRoute, useNavigate, type RootRoute } from "@tanstack/react-router";
import { useAuthStore } from "@/stores/auth";
import { env } from "@/env";
import { PKCE_STORAGE_KEY } from "@/components/auth/GoogleLoginButton";
import type { GoogleCallbackResponse } from "@inspirehub/shared/types";

function AuthCallbackPage() {
  const navigate = useNavigate();
  const { setAuth, setError } = useAuthStore();
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const accessToken = params.get("access_token");
      const error = params.get("error");

      if (error) {
        setStatus("error");
        setErrorMessage(`Authentication failed: ${error}`);
        setError(error);
        return;
      }

      if (!accessToken) {
        setStatus("error");
        setErrorMessage("No access token received");
        return;
      }

      try {
        // Clear PKCE storage (no longer needed)
        sessionStorage.removeItem(PKCE_STORAGE_KEY);

        // Get user info using the access token
        const response = await fetch(`${env.VITE_API_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to get user information");
        }

        const user = await response.json();

        // Store auth state
        setAuth(user, accessToken);

        // Redirect to home
        navigate({ to: "/" });
      } catch (err) {
        setStatus("error");
        setErrorMessage(
          err instanceof Error ? err.message : "Authentication failed"
        );
        setError(err instanceof Error ? err.message : "Authentication failed");
      }
    };

    handleCallback();
  }, [navigate, setAuth, setError]);

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

export default (parentRoute: RootRoute) =>
  createRoute({
    getParentRoute: () => parentRoute,
    path: "/auth/callback",
    component: AuthCallbackPage,
  });
