import { Link, useMatchRoute } from "@tanstack/react-router";
import { Home, Compass, User } from "lucide-react";
import { UserMenu } from "./auth/UserMenu";
import { useAuthStore } from "@/stores/auth";

const navLinks = [
  { to: "/", icon: Home, label: "ホーム" },
  { to: "/discover", icon: Compass, label: "見つける" },
  { to: "/profile", icon: User, label: "マイページ" },
] as const;

export default function Header() {
  const { isAuthenticated } = useAuthStore();
  const matchRoute = useMatchRoute();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link to="/" className="text-xl font-bold tracking-tight text-foreground">
          InspireHub
        </Link>

        {isAuthenticated && (
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map(({ to, icon: Icon, label }) => {
              const isActive = matchRoute({ to, fuzzy: to !== "/" });
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              );
            })}
          </nav>
        )}

        {isAuthenticated && (
          <div>
            <UserMenu />
          </div>
        )}
      </div>
    </header>
  );
}
