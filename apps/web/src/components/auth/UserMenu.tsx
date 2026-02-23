import { useAuthStore } from "@/stores/auth";
import { api } from "@/lib/api";
import { LogOut } from "lucide-react";

export function UserMenu() {
  const { isAuthenticated, logout, accessToken } = useAuthStore();

  const handleLogout = async () => {
    if (!window.confirm("ログアウトしますか？")) return;
    if (accessToken) {
      try {
        await api.auth.logout.$post();
      } catch {
        /* logout API failure is non-critical */
      }
    }
    logout();
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <button
      onClick={handleLogout}
      aria-label="ログアウト"
      className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
    >
      <LogOut size={18} />
    </button>
  );
}
