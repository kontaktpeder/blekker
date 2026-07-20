import { Link, useRouterState } from "@tanstack/react-router";
import { ListMusic, Music2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

const TABS = [
  {
    to: "/songs",
    label: "Library",
    match: (p: string) =>
      p === "/songs" || (p.startsWith("/songs/") && p !== "/songs/new"),
    icon: Music2,
  },
  {
    to: "/setlists",
    label: "Setlists",
    match: (p: string) => p.startsWith("/setlists"),
    icon: ListMusic,
  },
  {
    to: "/songs/new",
    label: "New",
    match: (p: string) => p === "/songs/new",
    icon: Plus,
  },
] as const;

/** iPad / phone bottom nav — clear destinations + theme. Hidden in Live. */
export function AppTabBar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const live = useRouterState({
    select: (s) => {
      const search = s.location.search as { live?: boolean | string | number };
      return search?.live === true || search?.live === "1" || search?.live === 1;
    },
  });
  if (live) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[90] border-t border-border bg-background/95 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Hovedmeny"
    >
      <div className="flex items-stretch justify-around gap-1 px-2 pt-1.5 pb-1 max-w-lg mx-auto">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-2 min-h-12 font-mono text-[10px] tracking-[0.12em] uppercase transition-colors",
                active
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/60",
              )}
            >
              <Icon className="h-5 w-5" />
              {tab.label}
            </Link>
          );
        })}
        <div className="flex flex-col items-center justify-center px-2 min-h-12">
          <ThemeToggle size="sm" className="shadow-none" />
        </div>
      </div>
    </nav>
  );
}

/** Spacer so page content clears the tab bar on small screens. */
export function AppTabBarSpacer() {
  const live = useRouterState({
    select: (s) => {
      const search = s.location.search as { live?: boolean | string | number };
      return search?.live === true || search?.live === "1" || search?.live === 1;
    },
  });
  if (live) return null;
  return <div className="h-16 lg:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }} aria-hidden />;
}
