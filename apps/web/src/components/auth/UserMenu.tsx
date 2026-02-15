import { useAuthStore } from "@/stores/auth";
import { api } from "@/lib/api";
import { LogOut } from "lucide-react";

export function UserMenu() {
  const { isAuthenticated, logout } = useAuthStore();

  const handleLogout = async () => {
    if (!window.confirm("ログアウトしますか？")) return;
    try {
      await api.auth.logout.$post();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      logout();
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <button
      onClick={handleLogout}
      className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
    >
      <LogOut size={18} />
    </button>
  );
}
