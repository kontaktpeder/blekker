import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

const LINKS = [
  { to: "/songs", label: "Library" },
  { to: "/setlists", label: "Setlists" },
  { to: "/songs/new", label: "New" },
] as const;

export function TopNav() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  return (
    <nav className="flex items-center gap-2 px-4 md:px-6 h-14 md:h-16 border-b border-border bg-background/90 backdrop-blur-md">
      <Link
        to="/"
        className="font-mono uppercase tracking-[0.22em] text-xs mr-2 md:mr-4 text-muted-foreground hover:text-foreground shrink-0"
      >
        ◆ Stagechart
      </Link>
      <div className="hidden md:flex gap-1 flex-1">
        {LINKS.map((l) => {
          const active =
            l.to === "/songs"
              ? pathname === "/songs" ||
                (pathname.startsWith("/songs/") && pathname !== "/songs/new")
              : l.to === "/songs/new"
                ? pathname === "/songs/new"
                : pathname === l.to || pathname.startsWith(l.to + "/");
          return (
            <Link
              key={l.to}
              to={l.to}
              className={cn(
                "px-4 py-2.5 rounded-md font-mono uppercase tracking-wider text-xs transition-colors min-h-11 inline-flex items-center",
                active
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {l.label}
            </Link>
          );
        })}
      </div>
      <div className="flex-1 md:flex-none" />
      {/* Theme lives in bottom tab bar below lg (phones / iPad portrait). */}
      <ThemeToggle size="sm" className="shadow-none shrink-0 hidden lg:inline-flex" />
    </nav>
  );
}
