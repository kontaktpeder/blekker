import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Maximize2, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  useSetlist,
  useSongs,
  useSong,
  useAddSongToSetlist,
  useRemoveFromSetlist,
  useReorderSetlist,
} from "@/hooks/useSongs";
import { getSong } from "@/lib/songs.functions";
import { SongChart, type SetlistLiveItem } from "@/components/chart/SongChart";
import { SetlistSortableList } from "@/components/setlist/SetlistSortableList";
import { ThemeToggle } from "@/components/ThemeToggle";
import { dbToSong } from "@/lib/song-mapper";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type SetlistSearch = {
  song?: string;
  live: boolean;
};

export const Route = createFileRoute("/setlists/$id")({
  validateSearch: (raw: Record<string, unknown>): SetlistSearch => ({
    song: typeof raw.song === "string" && raw.song.length > 0 ? raw.song : undefined,
    live: raw.live === true || raw.live === "1" || raw.live === 1,
  }),
  component: SetlistDetailPage,
});

function SetlistDetailPage() {
  const { id } = Route.useParams();
  const { song: songParam, live: liveSession } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const qc = useQueryClient();
  const getSongFn = useServerFn(getSong);

  const { data, isLoading } = useSetlist(id);
  const { data: allSongs } = useSongs();
  const add = useAddSongToSetlist();
  const remove = useRemoveFromSetlist(id);
  const reorder = useReorderSetlist();

  const [sidebarOpen, setSidebarOpen] = useState(!liveSession);

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

  const activeSongId = useMemo(() => {
    if (songParam && navItems.some((s) => s.id === songParam)) return songParam;
    return navItems[0]?.id ?? null;
  }, [songParam, navItems]);

  const activeIndex = Math.max(
    0,
    navItems.findIndex((s) => s.id === activeSongId),
  );

  const { data: songData } = useSong(activeSongId ?? undefined);

  // Prefetch neighbours for snappy Live prev/next on iPad.
  useEffect(() => {
    const ids = [navItems[activeIndex - 1]?.id, navItems[activeIndex + 1]?.id].filter(
      Boolean,
    ) as string[];
    for (const sid of ids) {
      void qc.prefetchQuery({
        queryKey: ["songs", sid],
        queryFn: () => getSongFn({ data: { id: sid } }),
      });
    }
  }, [activeIndex, navItems, qc, getSongFn]);

  // Keep URL song in sync when list loads / first song.
  useEffect(() => {
    if (!activeSongId) return;
    if (songParam === activeSongId) return;
    void navigate({
      search: (prev: SetlistSearch) => ({ ...prev, song: activeSongId }),
      replace: true,
    });
  }, [activeSongId, songParam, navigate]);

  useEffect(() => {
    if (liveSession) setSidebarOpen(false);
  }, [liveSession]);

  const usedSongIds = useMemo(
    () => new Set(items.map((it) => it.arrangements?.songs?.id).filter(Boolean)),
    [items],
  );
  const addable = (allSongs ?? []).filter((s) => !usedSongIds.has(s.id));

  const setSearch = (patch: Partial<SetlistSearch>) => {
    void navigate({
      search: (prev: SetlistSearch) => ({ ...prev, ...patch }),
      replace: true,
    });
  };

  const selectSong = (songId: string) => {
    setSearch({ song: songId });
  };

  const sortableItems = useMemo(
    () =>
      items
        .map((it) => {
          const song = it.arrangements?.songs;
          if (!song?.id) return null;
          return {
            itemId: it.id,
            songId: song.id,
            title: song.title,
            artist: song.artist ?? null,
            bpm: song.bpm ?? null,
          };
        })
        .filter(Boolean) as {
          itemId: string;
          songId: string;
          title: string;
          artist: string | null;
          bpm: number | null;
        }[],
    [items],
  );

  const startLive = () => {
    if (navItems.length === 0) {
      toast.error("Legg til minst én låt først");
      return;
    }
    const sid = activeSongId ?? navItems[0].id;
    setSidebarOpen(false);
    setSearch({ song: sid, live: true });
  };

  const setlistLive = useMemo(() => {
    if (navItems.length === 0) return undefined;
    return {
      items: navItems,
      index: activeIndex,
      onGoTo: (i: number) => {
        const target = navItems[i];
        if (!target) return;
        void navigate({
          search: (prev: SetlistSearch) => ({ ...prev, song: target.id, live: true }),
          replace: true,
        });
      },
      onExitLive: () => {
        setSidebarOpen(true);
        void navigate({
          search: (prev: SetlistSearch) => ({ ...prev, live: false }),
          replace: true,
        });
      },
    };
  }, [navItems, activeIndex, navigate]);

  if (isLoading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground font-mono text-sm">
        Loading setlist…
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-dvh w-full overflow-hidden bg-background text-foreground",
        !liveSession && "pb-16 lg:pb-0",
      )}
      data-live={liveSession ? "1" : undefined}
    >
      <aside
        className={cn(
          "z-50 flex flex-col border-r border-border bg-card/40 backdrop-blur-md transition-all duration-200",
          "fixed left-0 top-0 lg:static",
          liveSession
            ? "hidden"
            : sidebarOpen
              ? "w-[min(22rem,92vw)] translate-x-0 bottom-16 lg:bottom-0"
              : "w-[min(22rem,92vw)] -translate-x-full bottom-16 lg:bottom-0 lg:w-14 lg:translate-x-0",
        )}
      >
        <div className="flex items-center gap-2 px-3 h-14 border-b border-border">
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            className="min-h-11 min-w-11 p-2 rounded-md hover:bg-accent font-mono"
            aria-label="Toggle"
          >
            ☰
          </button>
          {sidebarOpen && (
            <>
              <Link
                to="/setlists"
                className="font-mono uppercase tracking-[0.18em] text-xs text-muted-foreground hover:text-foreground min-h-11 inline-flex items-center"
              >
                ← Setlists
              </Link>
              <div className="ml-auto flex items-center gap-1">
                <Link
                  to="/songs"
                  className="hidden sm:inline-flex font-mono uppercase tracking-[0.14em] text-[10px] text-muted-foreground hover:text-foreground min-h-11 px-2 items-center"
                >
                  Library
                </Link>
                <ThemeToggle size="sm" className="shadow-none" />
              </div>
            </>
          )}
        </div>

        {sidebarOpen && (
          <div className="flex flex-1 flex-col min-h-0">
            <div className="px-4 pt-4 pb-3 border-b border-border space-y-3 shrink-0">
              <div>
                <p className="font-mono uppercase tracking-[0.18em] text-[10px] text-muted-foreground">
                  Setlist
                </p>
                <h2 className="text-lg font-semibold mt-1 truncate">
                  {data.setlist.name}
                </h2>
                <p className="mt-1 text-[10px] font-mono text-muted-foreground tracking-wide">
                  Hold ⋮⋮ og dra for å endre rekkefølge
                </p>
              </div>
              <Button
                size="sm"
                className="w-full font-mono uppercase tracking-wider text-xs min-h-11"
                onClick={startLive}
                disabled={navItems.length === 0}
              >
                <Maximize2 className="h-4 w-4 mr-1" />
                Start Live
              </Button>
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
              <SetlistSortableList
                items={sortableItems}
                activeSongId={activeSongId}
                onSelect={selectSong}
                onReorder={(orderedIds) =>
                  reorder.mutate({ setlistId: id, orderedIds })
                }
                onRemove={(itemId) => remove.mutate(itemId)}
              />
            </div>

            <div className="p-3 border-t border-border shrink-0">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full min-h-11"
                    disabled={addable.length === 0}
                  >
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
                      type="button"
                      onClick={() => {
                        add.mutate(
                          { setlistId: id, songId: s.id },
                          {
                            onError: (e) =>
                              toast.error(e instanceof Error ? e.message : "Failed"),
                          },
                        );
                      }}
                      className="w-full text-left rounded-md hover:bg-accent px-3 py-2.5 min-h-11"
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
          </div>
        )}
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        {!liveSession && (
          <div className="lg:hidden flex items-center h-14 px-3 border-b border-border bg-background/80 backdrop-blur gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="font-mono uppercase tracking-[0.18em] text-xs text-muted-foreground hover:text-foreground min-h-11 px-2"
            >
              ☰ Setlist
            </button>
            <Button
              size="sm"
              variant="outline"
              className="ml-auto font-mono uppercase tracking-wider text-[10px] h-10 min-h-11"
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
              key={activeSongId ?? "none"}
              song={dbToSong(songData.song, songData.arrangement)}
              initialMode={liveSession ? "live" : "full"}
              setlistLive={liveSession ? setlistLive : undefined}
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
