import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const LINKS = [
  { to: "/songs", label: "Library" },
  { to: "/setlists", label: "Setlists" },
  { to: "/songs/new", label: "New" },
];

export function TopNav() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  return (
    <nav className="flex items-center gap-1 px-4 md:px-6 h-14 border-b border-border bg-background/80 backdrop-blur-md">
      <Link
        to="/"
        className="font-mono uppercase tracking-[0.25em] text-xs mr-4 text-muted-foreground hover:text-foreground"
      >
        ◆ Stagechart
      </Link>
      <div className="flex gap-1">
        {LINKS.map((l) => {
          const active = pathname === l.to || pathname.startsWith(l.to + "/");
          return (
            <Link
              key={l.to}
              to={l.to}
              className={cn(
                "px-3 py-1.5 rounded-md font-mono uppercase tracking-wider text-xs transition-colors",
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
    </nav>
  );
}
