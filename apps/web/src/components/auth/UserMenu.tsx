import { useAuthStore } from "@/stores/auth";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

export function UserMenu() {
  const { user, isAuthenticated, logout } = useAuthStore();

  const handleLogout = async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      logout();
    }
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        {user.picture && (
          <img src={user.picture} alt={user.name} className="h-8 w-8 rounded-full" />
        )}
        <span className="text-sm font-medium">{user.name}</span>
      </div>
      <Button variant="outline" size="sm" onClick={handleLogout}>
        Logout
      </Button>
    </div>
  );
}
