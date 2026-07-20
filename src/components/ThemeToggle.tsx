import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";

type Props = {
  className?: string;
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
        "inline-flex items-center justify-center rounded-full border border-border bg-background text-foreground",
        "hover:bg-accent transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "[-webkit-tap-highlight-color:transparent]",
        size === "sm" ? "h-10 w-10" : "h-11 w-11",
        className,
      )}
      aria-label={dark ? "Bytt til lys modus" : "Bytt til mørk modus"}
      title={dark ? "Lys" : "Mørk"}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
