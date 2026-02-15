import { useEffect, useState } from "react";
import { refreshToken } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";

export function useTokenRefresh() {
  const { isAuthenticated, accessToken } = useAuthStore();
  const [isRefreshing, setIsRefreshing] = useState(
    () => isAuthenticated && !accessToken,
  );

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
  }, [isAuthenticated, accessToken]);

  return { isRefreshing };
}
