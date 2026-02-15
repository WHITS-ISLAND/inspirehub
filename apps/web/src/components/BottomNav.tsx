import { Link, useMatchRoute, useLocation } from "@tanstack/react-router";
import { Home, Compass, Plus, User } from "lucide-react";

const navItems = [
  { to: "/", icon: Home, label: "ホーム" },
  { to: "/discover", icon: Compass, label: "見つける" },
  { to: "/profile", icon: User, label: "マイページ" },
] as const;

export function BottomNav() {
  const matchRoute = useMatchRoute();
  const location = useLocation();
  const isDetailPage = /^\/nodes\/[^/]+$/.test(location.pathname) && !location.pathname.endsWith("/new");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm md:hidden">
      <div className="flex items-center justify-around py-2">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = matchRoute({ to, fuzzy: to !== "/" });
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs ${
                isActive ? "text-primary font-medium" : "text-muted-foreground"
              }`}
            >
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
      {!isDetailPage && (
        <Link
          to="/nodes/new"
          aria-label="新規ノード作成"
          className="absolute -top-16 right-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95 transition-transform"
        >
          <Plus size={24} />
        </Link>
      )}
    </nav>
  );
}
