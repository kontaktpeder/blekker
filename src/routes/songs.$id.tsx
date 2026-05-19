import { createFileRoute, Link } from "@tanstack/react-router";
import { useSong, useSongs } from "@/hooks/useSongs";
import { SongChart } from "@/components/chart/SongChart";
import { SetlistSidebar } from "@/components/chart/SetlistSidebar";
import { dbToSong } from "@/lib/song-mapper";
import { useState } from "react";
import type { Song } from "@/lib/music";

export const Route = createFileRoute("/songs/$id")({
  component: SongDetailPage,
});

function SongDetailPage() {
  const { id } = Route.useParams();
  const { data, isLoading, error } = useSong(id);
  const { data: allSongs } = useSongs();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground font-mono text-sm">
        Loading chart…
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <p>Could not load song.</p>
        <Link to="/songs" className="font-mono text-sm underline">
          ← Back to library
        </Link>
      </div>
    );
  }

  const song: Song = dbToSong(data.song, data.arrangement);

  const sidebarSongs =
    (allSongs ?? []).map((s) => ({
      id: s.id,
      title: s.title,
      artist: s.artist ?? "—",
      key: s.original_key ?? "C",
      bpm: s.bpm ?? 100,
      capo: s.capo ?? 0,
      timeSig: "4/4",
      form: [],
      sections: [],
    })) as Song[];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <SetlistSidebar
        songs={sidebarSongs}
        selectedId={id}
        onSelect={(nid) => {
          setSidebarOpen(false);
          if (nid !== id) {
            window.location.href = `/songs/${nid}`;
          }
        }}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
      />
      <main className="flex-1 min-w-0 flex flex-col">
        <div className="lg:hidden flex items-center h-12 px-3 border-b border-border bg-background/80 backdrop-blur">
          <button
            onClick={() => setSidebarOpen(true)}
            className="font-mono uppercase tracking-[0.18em] text-xs text-muted-foreground hover:text-foreground"
          >
            ☰ Library
          </button>
          <Link
            to="/songs"
            className="ml-auto font-mono text-xs uppercase tracking-wider text-muted-foreground"
          >
            All songs
          </Link>
        </div>
        <div className="flex-1 min-h-0">
          <SongChart key={song.id} song={song} />
        </div>
      </main>
    </div>
  );
}
