import { Music2, Menu } from "lucide-react";
import type { Song } from "@/lib/music";
import { cn } from "@/lib/utils";

interface Props {
  songs: Song[];
  selectedId: string;
  onSelect: (id: string) => void;
  open: boolean;
  onToggle: () => void;
}

export function SetlistSidebar({ songs, selectedId, onSelect, open, onToggle }: Props) {
  return (
    <>
      {/* Mobile / tablet drawer overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm lg:hidden"
          onClick={onToggle}
        />
      )}

      <aside
        className={cn(
          "z-50 flex flex-col border-r border-border bg-card/40 backdrop-blur-md transition-all duration-200",
          "fixed inset-y-0 left-0 lg:static",
          open ? "w-72 translate-x-0" : "w-72 -translate-x-full lg:w-14 lg:translate-x-0"
        )}
      >
        <div className="flex items-center gap-2 px-3 h-14 border-b border-border">
          <button
            onClick={onToggle}
            className="p-2 rounded-md hover:bg-accent"
            aria-label="Toggle setlist"
          >
            <Menu className="h-4 w-4" />
          </button>
          {open && (
            <div className="flex items-center gap-2 min-w-0">
              <Music2 className="h-4 w-4 text-primary" />
              <span className="font-mono uppercase tracking-[0.18em] text-xs">Setlist</span>
            </div>
          )}
        </div>

        {open && (
          <nav className="flex-1 overflow-y-auto p-2">
            <ol className="space-y-1">
              {songs.map((s, i) => {
                const active = s.id === selectedId;
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => onSelect(s.id)}
                      className={cn(
                        "w-full text-left rounded-md px-3 py-2.5 transition-colors group flex gap-3 items-start",
                        active
                          ? "bg-primary/10 border border-primary/30"
                          : "hover:bg-accent border border-transparent"
                      )}
                    >
                      <span
                        className={cn(
                          "font-mono text-xs tabular-nums pt-0.5 w-5",
                          active ? "text-primary" : "text-muted-foreground"
                        )}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block truncate text-sm font-medium",
                            active && "text-primary"
                          )}
                        >
                          {s.title}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground font-mono">
                          {s.artist} · {s.key} · {s.bpm}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
        )}
      </aside>
    </>
  );
}
