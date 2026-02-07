import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { useNavigate } from "@tanstack/react-router";
import { useAuthStore } from "@/stores/auth";
import { env } from "@/env";

export function GoogleLoginButton() {
  const navigate = useNavigate();
  const { setAuth, setError, setLoading } = useAuthStore();

  const handleSuccess = async (response: CredentialResponse) => {
    if (!response.credential) {
      setError("No credential received");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${env.VITE_API_URL}/auth/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id_token: response.credential }),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error?.message || "Authentication failed");
      }

      const data = await res.json();

      setAuth(data.user, data.access_token);
      void navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleError = () => {
    setError("Google Sign-In failed");
  };

  return (
    <GoogleLogin
      onSuccess={handleSuccess}
      onError={handleError}
      useOneTap
      theme="outline"
      size="large"
      width="100%"
    />
  );
}
