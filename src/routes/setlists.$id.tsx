import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  useSetlist,
  useSongs,
  useSong,
  useAddSongToSetlist,
  useRemoveFromSetlist,
  useReorderSetlist,
} from "@/hooks/useSongs";
import { SongChart } from "@/components/chart/SongChart";
import { dbToSong } from "@/lib/song-mapper";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/setlists/$id")({
  component: SetlistDetailPage,
});

function SetlistDetailPage() {
  const { id } = Route.useParams();
  const { data, isLoading } = useSetlist(id);
  const { data: allSongs } = useSongs();
  const add = useAddSongToSetlist();
  const remove = useRemoveFromSetlist(id);
  const reorder = useReorderSetlist();

  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const items = data?.items ?? [];

  // First item by default
  const activeSongId =
    selectedSongId ??
    (items[0]?.arrangements?.songs?.id as string | undefined) ??
    null;

  const { data: songData } = useSong(activeSongId ?? undefined);

  const usedSongIds = useMemo(
    () => new Set(items.map((it) => it.arrangements?.songs?.id).filter(Boolean)),
    [items],
  );
  const addable = (allSongs ?? []).filter((s) => !usedSongIds.has(s.id));

  const move = (idx: number, dir: -1 | 1) => {
    const ordered = items.map((i) => i.id);
    const j = idx + dir;
    if (j < 0 || j >= ordered.length) return;
    [ordered[idx], ordered[j]] = [ordered[j], ordered[idx]];
    reorder.mutate({ setlistId: id, orderedIds: ordered });
  };

  if (isLoading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground font-mono text-sm">
        Loading setlist…
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Custom sidebar for setlist */}
      <aside
        className={cn(
          "z-50 flex flex-col border-r border-border bg-card/40 backdrop-blur-md transition-all duration-200",
          "fixed inset-y-0 left-0 lg:static",
          sidebarOpen ? "w-80 translate-x-0" : "w-80 -translate-x-full lg:w-14 lg:translate-x-0",
        )}
      >
        <div className="flex items-center gap-2 px-3 h-14 border-b border-border">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-2 rounded-md hover:bg-accent font-mono"
            aria-label="Toggle"
          >
            ☰
          </button>
          {sidebarOpen && (
            <Link
              to="/setlists"
              className="font-mono uppercase tracking-[0.18em] text-xs text-muted-foreground hover:text-foreground"
            >
              ← Setlists
            </Link>
          )}
        </div>

        {sidebarOpen && (
          <>
            <div className="px-4 pt-4 pb-3 border-b border-border">
              <p className="font-mono uppercase tracking-[0.18em] text-[10px] text-muted-foreground">
                Setlist
              </p>
              <h2 className="text-lg font-semibold mt-1 truncate">
                {data.setlist.name}
              </h2>
            </div>

            <ol className="flex-1 overflow-y-auto p-2 space-y-1">
              {items.length === 0 && (
                <li className="text-sm text-muted-foreground p-3">
                  No songs yet. Add one below.
                </li>
              )}
              {items.map((it, i) => {
                const song = it.arrangements?.songs;
                if (!song) return null;
                const active = song.id === activeSongId;
                return (
                  <li
                    key={it.id}
                    className={cn(
                      "group rounded-md border flex items-start gap-2 px-3 py-2.5 transition-colors",
                      active
                        ? "bg-primary/10 border-primary/30"
                        : "border-transparent hover:bg-accent",
                    )}
                  >
                    <button
                      onClick={() => setSelectedSongId(song.id)}
                      className="flex-1 text-left min-w-0"
                    >
                      <div className="flex gap-2">
                        <span
                          className={cn(
                            "font-mono text-xs tabular-nums pt-0.5 w-5",
                            active ? "text-primary" : "text-muted-foreground",
                          )}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="min-w-0">
                          <span
                            className={cn(
                              "block truncate text-sm font-medium",
                              active && "text-primary",
                            )}
                          >
                            {song.title}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground font-mono">
                            {song.artist ?? "—"} · {song.bpm ?? "—"} BPM
                          </span>
                        </span>
                      </div>
                    </button>
                    <div className="flex flex-col opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => move(i, -1)}
                        className="p-0.5 text-muted-foreground hover:text-foreground"
                        aria-label="Move up"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => move(i, 1)}
                        className="p-0.5 text-muted-foreground hover:text-foreground"
                        aria-label="Move down"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm("Remove from setlist?")) remove.mutate(it.id);
                      }}
                      className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                      aria-label="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ol>

            <div className="p-3 border-t border-border">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full" disabled={addable.length === 0}>
                    <Plus className="h-4 w-4 mr-1" />
                    {addable.length === 0 ? "All songs added" : "Add song"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-2 max-h-80 overflow-y-auto">
                  {addable.length === 0 && (
                    <p className="text-sm text-muted-foreground p-2">
                      No more songs in library.
                    </p>
                  )}
                  {addable.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        add.mutate(
                          { setlistId: id, songId: s.id },
                          {
                            onError: (e) =>
                              toast.error(e instanceof Error ? e.message : "Failed"),
                          },
                        );
                      }}
                      className="w-full text-left rounded-md hover:bg-accent px-3 py-2"
                    >
                      <p className="text-sm font-medium truncate">{s.title}</p>
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        {s.artist ?? "—"}
                      </p>
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
            </div>
          </>
        )}
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        <div className="lg:hidden flex items-center h-12 px-3 border-b border-border bg-background/80 backdrop-blur">
          <button
            onClick={() => setSidebarOpen(true)}
            className="font-mono uppercase tracking-[0.18em] text-xs text-muted-foreground hover:text-foreground"
          >
            ☰ Setlist
          </button>
        </div>
        <div className="flex-1 min-h-0">
          {songData ? (
            <SongChart
              key={songData.song.id}
              song={dbToSong(songData.song, songData.arrangement)}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <p>Select a song from the setlist to start.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
