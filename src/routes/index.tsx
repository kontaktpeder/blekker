import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SONGS } from "@/lib/songs";
import { SongChart } from "@/components/chart/SongChart";
import { SetlistSidebar } from "@/components/chart/SetlistSidebar";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Stagechart — Digital Band Charts" },
      {
        name: "description",
        content:
          "A professional digital music stand for bands. Standardized song charts, transpose, and live performance mode.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [selectedId, setSelectedId] = useState(SONGS[0].id);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const song = SONGS.find((s) => s.id === selectedId) ?? SONGS[0];

  return (
    <div className="dark flex h-screen w-full overflow-hidden bg-background text-foreground">
      <SetlistSidebar
        songs={SONGS}
        selectedId={selectedId}
        onSelect={(id) => {
          setSelectedId(id);
          setSidebarOpen(false);
        }}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
      />

      <main className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar with menu */}
        <div className="lg:hidden flex items-center h-12 px-3 border-b border-border bg-background/80 backdrop-blur">
          <button
            onClick={() => setSidebarOpen(true)}
            className="font-mono uppercase tracking-[0.18em] text-xs text-muted-foreground hover:text-foreground"
          >
            ☰ Setlist
          </button>
          <span className="ml-auto font-mono text-xs text-muted-foreground tabular-nums">
            {SONGS.findIndex((s) => s.id === selectedId) + 1} / {SONGS.length}
          </span>
        </div>

        <div className="flex-1 min-h-0">
          <SongChart key={song.id} song={song} />
        </div>
      </main>
    </div>
  );
}
