import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuthStore } from "@/stores/auth";
import { useTokenRefresh } from "@/hooks/use-token-refresh";

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuthStore();
  const { isRefreshing } = useTokenRefresh();

  useEffect(() => {
    if (!isLoading && !isRefreshing && !isAuthenticated) {
      void navigate({ to: "/login" });
    }
  }, [isAuthenticated, isLoading, isRefreshing, navigate]);

  if (isLoading || isRefreshing) {
    return fallback || null;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
