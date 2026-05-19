import { useMemo, useState } from "react";
import { Minus, Plus, Eye, EyeOff, Maximize2, X } from "lucide-react";
import { transposeKey, type Song } from "@/lib/music";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SectionCard } from "./SectionCard";
import { FormStrip } from "./FormStrip";

type ViewMode = "full" | "chart" | "form" | "live";

const MODES: { id: ViewMode; label: string }[] = [
  { id: "full", label: "Full" },
  { id: "chart", label: "Chart" },
  { id: "form", label: "Form" },
  { id: "live", label: "Live" },
];

interface Props {
  song: Song;
}

export function SongChart({ song }: Props) {
  const [mode, setMode] = useState<ViewMode>("full");
  const [semitones, setSemitones] = useState(0);
  const [showLyrics, setShowLyrics] = useState(true);

  const displayKey = useMemo(() => transposeKey(song.key, semitones), [song.key, semitones]);
  const isLive = mode === "live";
  const showNotes = mode === "full" || mode === "live";
  const lyricsOn = showLyrics && (mode === "full" || mode === "live");

  return (
    <div className={cn("flex flex-col h-full", isLive && "fixed inset-0 z-50 bg-background")}>
      {/* Header */}
      <header
        className={cn(
          "border-b border-border/70 bg-background/80 backdrop-blur-md",
          isLive ? "px-6 md:px-10 py-5" : "px-5 md:px-8 py-4"
        )}
      >
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="min-w-0">
            <h1
              className={cn(
                "font-semibold tracking-tight leading-none text-balance",
                isLive ? "text-4xl md:text-6xl" : "text-2xl md:text-4xl"
              )}
            >
              {song.title}
            </h1>
            <p
              className={cn(
                "mt-2 font-mono uppercase tracking-[0.18em] text-muted-foreground",
                isLive ? "text-base" : "text-xs md:text-sm"
              )}
            >
              {song.artist}
            </p>
          </div>

          {/* Meta ticker */}
          <div
            className={cn(
              "flex items-center gap-3 md:gap-5 rounded-lg border border-border bg-card/60 px-4 py-2 font-mono tabular-nums",
              isLive ? "text-2xl md:text-3xl" : "text-sm md:text-base"
            )}
          >
            <Meta label="KEY" value={displayKey} />
            <div className="ticker-divider" />
            <Meta label="BPM" value={String(song.bpm)} />
            <div className="ticker-divider" />
            <Meta label="CAPO" value={song.capo ? String(song.capo) : "—"} />
            {song.timeSig && (
              <>
                <div className="ticker-divider hidden md:block" />
                <div className="hidden md:block">
                  <Meta label="TIME" value={song.timeSig} />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="mt-4 flex flex-wrap items-center gap-2 md:gap-3">
          {/* Mode toggle */}
          <div className="flex rounded-md border border-border bg-card/60 p-0.5">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={cn(
                  "px-3 md:px-4 py-1.5 text-xs md:text-sm font-mono uppercase tracking-wider rounded-[5px] transition-colors",
                  mode === m.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Transpose */}
          <div className="flex items-center rounded-md border border-border bg-card/60">
            <button
              onClick={() => setSemitones((s) => s - 1)}
              className="p-2 hover:bg-accent rounded-l-md"
              aria-label="Transpose down"
            >
              <Minus className="h-4 w-4" />
            </button>
            <div className="px-3 font-mono text-xs md:text-sm tabular-nums w-20 text-center">
              {semitones === 0 ? "± 0" : semitones > 0 ? `+${semitones}` : semitones} st
            </div>
            <button
              onClick={() => setSemitones((s) => s + 1)}
              className="p-2 hover:bg-accent rounded-r-md"
              aria-label="Transpose up"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Lyrics toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLyrics((v) => !v)}
            className="font-mono uppercase tracking-wider text-xs"
          >
            {showLyrics ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            <span className="ml-2">Lyrics</span>
          </Button>

          <div className="ml-auto">
            {isLive ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMode("full")}
                className="font-mono uppercase tracking-wider text-xs"
              >
                <X className="h-4 w-4 mr-1" /> Exit Live
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => setMode("live")}
                className="font-mono uppercase tracking-wider text-xs"
              >
                <Maximize2 className="h-4 w-4 mr-1" /> Live
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Body */}
      <div
        className={cn(
          "flex-1 overflow-y-auto",
          isLive ? "px-6 md:px-12 py-8" : "px-5 md:px-8 py-6"
        )}
      >
        {/* Form summary */}
        <div className={cn("mb-6", isLive && "mb-10")}>
          <p
            className={cn(
              "font-mono uppercase tracking-[0.18em] text-muted-foreground mb-3",
              isLive ? "text-sm" : "text-[10px] md:text-xs"
            )}
          >
            Form
          </p>
          <FormStrip form={song.form} large={isLive} />
        </div>

        {mode === "form" ? null : (
          <div className={cn("grid gap-4", isLive ? "gap-6" : "md:gap-5")}>
            {song.sections.map((s) => (
              <SectionCard
                key={s.id}
                section={s}
                semitones={semitones}
                showLyrics={lyricsOn}
                showNotes={showNotes}
                mode={isLive ? "live" : mode === "chart" ? "chart" : "full"}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-start leading-none">
      <span className="text-[9px] md:text-[10px] text-muted-foreground tracking-[0.2em]">
        {label}
      </span>
      <span className="mt-1 font-semibold">{value}</span>
    </div>
  );
}
