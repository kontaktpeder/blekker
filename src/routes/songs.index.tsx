import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useSongs, useDeleteSong } from "@/hooks/useSongs";
import { Button } from "@/components/ui/button";
import { TopNav } from "@/components/chart/TopNav";
import { AppTabBarSpacer } from "@/components/AppTabBar";

export const Route = createFileRoute("/songs/")({
  head: () => ({
    meta: [
      { title: "Library — Stagechart" },
      { name: "description", content: "Your saved song charts." },
    ],
  }),
  component: SongsPage,
});

function SongsPage() {
  const { data, isLoading } = useSongs();
  const del = useDeleteSong();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <TopNav />
      <div className="px-6 md:px-12 py-8 flex-1">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <p className="font-mono uppercase tracking-[0.3em] text-xs text-muted-foreground">
              Library
            </p>
            <h1 className="mt-2 text-3xl md:text-5xl font-semibold tracking-tight">
              Songs
            </h1>
          </div>
          <Button onClick={() => navigate({ to: "/songs/new" })}>
            <Plus className="h-4 w-4 mr-1" /> New chart
          </Button>
        </div>

        {isLoading && (
          <p className="font-mono text-sm text-muted-foreground">Loading…</p>
        )}

        {!isLoading && (data?.length ?? 0) === 0 && (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <p className="text-lg text-muted-foreground">No songs yet.</p>
            <Button className="mt-4" onClick={() => navigate({ to: "/songs/new" })}>
              Lag din første blekke
            </Button>
          </div>
        )}

        <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {data?.map((s) => (
            <li
              key={s.id}
              className="group relative rounded-xl border border-border bg-card/40 hover:bg-card transition-colors"
            >
              <Link
                to="/songs/$id"
                params={{ id: s.id }}
                className="block p-5"
              >
                <p className="text-lg font-semibold truncate">{s.title}</p>
                <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground mt-1 truncate">
                  {s.artist ?? "—"}
                </p>
                <div className="mt-4 flex gap-4 font-mono text-xs tabular-nums text-muted-foreground">
                  <span>
                    <span className="text-foreground/70">{s.original_key ?? "—"}</span>{" "}
                    KEY
                  </span>
                  <span>
                    <span className="text-foreground/70">{s.bpm ?? "—"}</span> BPM
                  </span>
                  <span>
                    <span className="text-foreground/70">{s.capo ?? 0}</span> CAPO
                  </span>
                </div>
              </Link>
              <button
                onClick={() => {
                  if (confirm(`Delete "${s.title}"?`)) del.mutate(s.id);
                }}
                className="absolute top-3 right-3 p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-accent opacity-0 group-hover:opacity-100 transition"
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      </div>
      <AppTabBarSpacer />
    </div>
  );
}
