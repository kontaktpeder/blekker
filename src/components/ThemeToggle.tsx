import { Moon, Sun } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";

type Props = {
  className?: string;
  /** Compact icon button for chrome bars */
  size?: "sm" | "md";
};

export function ThemeToggle({ className, size = "md" }: Props) {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "inline-flex items-center justify-center rounded-full border border-border bg-background text-foreground shadow-md",
        "hover:bg-accent transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "[-webkit-tap-highlight-color:transparent]",
        size === "sm" ? "h-9 w-9" : "h-10 w-10",
        className,
      )}
      aria-label={dark ? "Bytt til lys modus" : "Bytt til mørk modus"}
      title={dark ? "Lys" : "Mørk"}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

/** Always-on floating control — hidden during setlist Live (toolbar has toggle). */
export function ThemeToggleFab() {
  const hide = useRouterState({
    select: (s) => {
      const search = s.location.search as { live?: boolean | string | number };
      return search?.live === true || search?.live === "1" || search?.live === 1;
    },
  });
  if (hide) return null;

  return (
    <div
      className="pointer-events-none fixed z-[100] left-3"
      style={{
        top: "max(0.75rem, env(safe-area-inset-top))",
      }}
    >
      <div className="pointer-events-auto">
        <ThemeToggle />
      </div>
    </div>
  );
}
