import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuthStore } from "@/stores/auth";
import { refreshToken } from "@/lib/api";

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, accessToken } = useAuthStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !accessToken && !isRefreshing) {
      setIsRefreshing(true);
      void refreshToken().then((ok) => {
        if (!ok) {
          useAuthStore.getState().logout();
        }
        setIsRefreshing(false);
      });
    }
  }, [isAuthenticated, accessToken, isRefreshing]);

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
