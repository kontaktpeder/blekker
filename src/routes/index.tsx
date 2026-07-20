import { createFileRoute, Link } from "@tanstack/react-router";
import { ListMusic, Music2, Sparkles } from "lucide-react";
import { AppTabBarSpacer } from "@/components/AppTabBar";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Stagechart — Digital Band Charts" },
      {
        name: "description",
        content:
          "A professional digital music stand. Paste a URL or chords, get a standardized chart, play live.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="px-6 md:px-12 pt-10 md:pt-16 pb-6 flex items-start justify-between gap-4">
        <div>
        <p className="font-mono uppercase tracking-[0.3em] text-xs text-muted-foreground">
          Stagechart
        </p>
        <h1 className="mt-3 text-4xl md:text-6xl font-semibold tracking-tight text-balance max-w-3xl">
          One chart language for every song on stage.
        </h1>
        <p className="mt-4 text-muted-foreground max-w-xl md:text-lg">
          Paste any lyrics or chord sheet. Get a clean, transposable,
          performance-ready chart you and the band can actually read.
        </p>
        </div>
        <ThemeToggle size="sm" className="shadow-none shrink-0 hidden lg:inline-flex mt-1" />
      </header>

      <main className="px-6 md:px-12 pb-12 grid gap-4 md:grid-cols-3 max-w-6xl">
        <Tile
          to="/songs/new"
          label="New chart"
          desc="Drop a URL or chord sheet, AI builds the blekke."
          icon={<Sparkles className="h-5 w-5" />}
          accent
        />
        <Tile
          to="/songs"
          label="Song library"
          desc="Every saved chart, ready for the music stand."
          icon={<Music2 className="h-5 w-5" />}
        />
        <Tile
          to="/setlists"
          label="Setlists"
          desc="Build a night's set, open straight into Live mode."
          icon={<ListMusic className="h-5 w-5" />}
        />
      </main>
      <AppTabBarSpacer />
    </div>
  );
}

function Tile({
  to,
  label,
  desc,
  icon,
  accent,
}: {
  to: string;
  label: string;
  desc: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <Link
      to={to}
      className={
        "group rounded-xl border p-6 transition-colors flex flex-col gap-3 " +
        (accent
          ? "border-primary/40 bg-primary/5 hover:bg-primary/10"
          : "border-border bg-card/40 hover:bg-card")
      }
    >
      <div className={"inline-flex h-10 w-10 items-center justify-center rounded-md " + (accent ? "bg-primary text-primary-foreground" : "bg-accent text-foreground")}>
        {icon}
      </div>
      <div>
        <p className="font-semibold text-lg">{label}</p>
        <p className="text-sm text-muted-foreground mt-1">{desc}</p>
      </div>
      <span className="mt-auto font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground group-hover:text-foreground">
        Open →
      </span>
    </Link>
  );
}
