import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Maximize2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  useSetlist,
  useSongs,
  useSong,
  useAddSongToSetlist,
  useRemoveFromSetlist,
  useReorderSetlist,
} from "@/hooks/useSongs";
import { SongChart, type SetlistLiveItem } from "@/components/chart/SongChart";
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
  const [liveSession, setLiveSession] = useState(false);

  const items = data?.items ?? [];

  const navItems: SetlistLiveItem[] = useMemo(() => {
    const out: SetlistLiveItem[] = [];
    for (const it of items) {
      const song = it.arrangements?.songs as
        | {
            id: string;
            title: string;
            artist: string | null;
            bpm: number | null;
            original_key?: string | null;
            capo?: number | null;
          }
        | null
        | undefined;
      if (!song?.id) continue;
      const key =
        (it.arrangements as { current_key?: string | null } | null)?.current_key ||
        song.original_key ||
        "C";
      out.push({
        id: song.id,
        title: song.title,
        artist: song.artist ?? "—",
        key,
        bpm: song.bpm ?? 0,
        capo: song.capo ?? undefined,
      });
    }
    return out;
  }, [items]);

  const activeSongId =
    selectedSongId ?? navItems[0]?.id ?? null;

  const activeIndex = Math.max(
    0,
    navItems.findIndex((s) => s.id === activeSongId),
  );

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

  const startLive = () => {
    if (navItems.length === 0) {
      toast.error("Legg til minst én låt først");
      return;
    }
    setLiveSession(true);
    setSidebarOpen(false);
  };

  const setlistLive = useMemo(() => {
    if (navItems.length === 0) return undefined;
    return {
      items: navItems,
      index: activeIndex,
      onGoTo: (i: number) => {
        const target = navItems[i];
        if (target) setSelectedSongId(target.id);
      },
      onExitLive: () => {
        setLiveSession(false);
        setSidebarOpen(true);
      },
    };
  }, [navItems, activeIndex]);

  if (isLoading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground font-mono text-sm">
        Loading setlist…
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <aside
        className={cn(
          "z-50 flex flex-col border-r border-border bg-card/40 backdrop-blur-md transition-all duration-200",
          "fixed inset-y-0 left-0 lg:static",
          liveSession
            ? "hidden"
            : sidebarOpen
              ? "w-80 translate-x-0"
              : "w-80 -translate-x-full lg:w-14 lg:translate-x-0",
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
            <div className="px-4 pt-4 pb-3 border-b border-border space-y-3">
              <div>
                <p className="font-mono uppercase tracking-[0.18em] text-[10px] text-muted-foreground">
                  Setlist
                </p>
                <h2 className="text-lg font-semibold mt-1 truncate">
                  {data.setlist.name}
                </h2>
              </div>
              <Button
                size="sm"
                className="w-full font-mono uppercase tracking-wider text-xs"
                onClick={startLive}
                disabled={navItems.length === 0}
              >
                <Maximize2 className="h-4 w-4 mr-1" />
                Start Live
              </Button>
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
        {!liveSession && (
          <div className="lg:hidden flex items-center h-12 px-3 border-b border-border bg-background/80 backdrop-blur gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="font-mono uppercase tracking-[0.18em] text-xs text-muted-foreground hover:text-foreground"
            >
              ☰ Setlist
            </button>
            <Button
              size="sm"
              variant="outline"
              className="ml-auto font-mono uppercase tracking-wider text-[10px] h-8"
              onClick={startLive}
              disabled={navItems.length === 0}
            >
              <Maximize2 className="h-3.5 w-3.5 mr-1" />
              Live
            </Button>
          </div>
        )}
        <div className="flex-1 min-h-0">
          {songData ? (
            <SongChart
              song={dbToSong(songData.song, songData.arrangement)}
              initialMode={liveSession ? "live" : "full"}
              setlistLive={setlistLive}
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
