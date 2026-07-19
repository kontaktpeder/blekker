import { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, Eye, EyeOff, Maximize2, X, Play, Pause, Download } from "lucide-react";
import { transposeKey, type Song } from "@/lib/music";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SectionCard } from "./SectionCard";
import { FormStrip } from "./FormStrip";
import { exportChartPdf } from "@/lib/pdf/exportChartPdf";
import { ExportDialog } from "./ExportDialog";
import type { ExportFormat, ExportLayout, LeadSheetVariant } from "@/lib/pdf/layouts";
import { toast } from "sonner";

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
  const [scrollSpeed, setScrollSpeed] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const displayKey = useMemo(() => transposeKey(song.key, semitones), [song.key, semitones]);
  const isLive = mode === "live";
  const showNotes = mode === "full" || mode === "live";
  const lyricsOn = showLyrics && (mode === "full" || mode === "live");

  useEffect(() => {
    if (!isLive || scrollSpeed === 0) return;
    const el = scrollRef.current;
    if (!el) return;
    const pxPerSec = scrollSpeed === 1 ? 24 : scrollSpeed === 2 ? 52 : 96;
    let raf = 0;
    let last = performance.now();
    let scrollPosition = el.scrollTop;
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      scrollPosition = Math.min(scrollPosition + pxPerSec * dt, el.scrollHeight - el.clientHeight);
      el.scrollTop = scrollPosition;
      if (scrollPosition >= el.scrollHeight - el.clientHeight - 1) return;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isLive, scrollSpeed]);

  useEffect(() => {
    if (!isLive) setScrollSpeed(0);
  }, [isLive]);

  async function runExport(opts: { format: ExportFormat; layout: ExportLayout; variant?: LeadSheetVariant }) {
    if (exporting) return;
    setExporting(true);
    const t = toast.loading(opts.format === "pdf" ? "Lager PDF…" : "Lager ark…");
    try {
      await exportChartPdf({ song, semitones, showLyrics, ...opts });
      toast.success(opts.format === "pdf" ? "PDF klar" : "Ark klare", { id: t });
      setExportOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Kunne ikke eksportere", { id: t });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className={cn("flex flex-col h-full", isLive && "fixed inset-0 z-50 bg-background")}>
      {!isLive && (
        <header className="border-b border-border/70 bg-background/80 backdrop-blur-md px-5 md:px-8 py-4">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="min-w-0">
              <h1 className="font-semibold tracking-tight leading-none text-balance text-2xl md:text-4xl">
                {song.title}
              </h1>
              <p className="mt-2 font-mono uppercase tracking-[0.18em] text-muted-foreground text-xs md:text-sm">
                {song.artist}
              </p>
            </div>

            <div className="flex items-center gap-3 md:gap-5 rounded-lg border border-border bg-card/60 px-4 py-2 font-mono tabular-nums text-sm md:text-base">
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

          <div className="mt-4 flex flex-wrap items-center gap-2 md:gap-3">
            <div className="flex rounded-md border border-border bg-card/60 p-0.5">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={cn(
                    "px-3 md:px-4 py-1.5 text-xs md:text-sm font-mono uppercase tracking-wider rounded-[5px] transition-colors",
                    mode === m.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>

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

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLyrics((v) => !v)}
              className="font-mono uppercase tracking-wider text-xs"
            >
              {showLyrics ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              <span className="ml-2">Lyrics</span>
            </Button>

            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExportOpen(true)}
                disabled={exporting}
                className="font-mono uppercase tracking-wider text-xs"
              >
                <Download className="h-4 w-4 mr-1" />
                {exporting ? "Lager…" : "Last ned PDF"}
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => setMode("live")}
                className="font-mono uppercase tracking-wider text-xs"
              >
                <Maximize2 className="h-4 w-4 mr-1" /> Live
              </Button>
            </div>
          </div>
        </header>
      )}

      {/* Live: same Full structure & CSS, fullscreen */}
      {isLive && (
        <div className="absolute top-4 right-4 z-10 flex flex-wrap items-center justify-end gap-2 rounded-lg border border-border bg-background/80 backdrop-blur-md px-3 py-2 font-mono max-w-[calc(100%-2rem)]">
          <div className="flex items-center gap-3 px-2 tabular-nums text-sm">
            <span>
              <span className="text-muted-foreground text-[10px] tracking-[0.2em] mr-1">KEY</span>
              {displayKey}
            </span>
            <span>
              <span className="text-muted-foreground text-[10px] tracking-[0.2em] mr-1">BPM</span>
              {song.bpm}
            </span>
          </div>
          <div className="flex items-center border-l border-border pl-2">
            <button
              onClick={() => setSemitones((s) => s - 1)}
              className="p-1.5 hover:bg-accent rounded"
              aria-label="Transpose down"
            >
              <Minus className="h-4 w-4" />
            </button>
            <div className="px-2 text-xs tabular-nums w-12 text-center">
              {semitones === 0 ? "±0" : semitones > 0 ? `+${semitones}` : semitones}
            </div>
            <button
              onClick={() => setSemitones((s) => s + 1)}
              className="p-1.5 hover:bg-accent rounded"
              aria-label="Transpose up"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={() => setScrollSpeed((s) => (s + 1) % 4)}
            className="flex items-center gap-1 px-2 py-1.5 hover:bg-accent rounded border-l border-border ml-1"
            aria-label="Autoscroll speed"
            title="Autoscroll"
          >
            {scrollSpeed === 0 ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            <span className="text-[10px] tracking-[0.15em] w-8 text-center">
              {scrollSpeed === 0 ? "OFF" : scrollSpeed === 1 ? "SLOW" : scrollSpeed === 2 ? "MED" : "FAST"}
            </span>
          </button>
          <button
            onClick={() => setShowLyrics((v) => !v)}
            className="p-1.5 hover:bg-accent rounded border-l border-border ml-1 pl-2"
            aria-label="Toggle lyrics"
          >
            {showLyrics ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setExportOpen(true)}
            disabled={exporting}
            className="p-1.5 hover:bg-accent rounded border-l border-border ml-1 pl-2 disabled:opacity-50"
            aria-label="Last ned PDF"
            title="Last ned PDF"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            onClick={() => setMode("full")}
            className="p-1.5 hover:bg-accent rounded border-l border-border ml-1 pl-2"
            aria-label="Exit live"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-2 md:px-6 py-6">
        {isLive && (
          <div className="mb-8">
            <h1 className="font-semibold tracking-tight leading-none text-balance text-4xl md:text-6xl">
              {song.title}
            </h1>
            <p className="mt-2 font-mono uppercase tracking-[0.18em] text-muted-foreground text-base">
              {song.artist}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3 md:gap-5 rounded-lg border border-border bg-card/60 px-4 py-2 font-mono tabular-nums text-sm md:text-base w-fit">
              <Meta label="KEY" value={displayKey} />
              <div className="ticker-divider" />
              <Meta label="BPM" value={String(song.bpm)} />
              <div className="ticker-divider" />
              <Meta label="CAPO" value={song.capo ? String(song.capo) : "—"} />
              {song.timeSig && (
                <>
                  <div className="ticker-divider" />
                  <Meta label="TIME" value={song.timeSig} />
                </>
              )}
            </div>
          </div>
        )}

        {mode !== "form" && (
          <div className={cn("mb-6", isLive && "mb-10")}>
            <p
              className={cn(
                "font-mono uppercase tracking-[0.18em] text-muted-foreground mb-3",
                isLive ? "text-sm" : "text-[10px] md:text-xs",
              )}
            >
              Form
            </p>
            <FormStrip form={song.form} large={isLive} />
          </div>
        )}

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
      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        onConfirm={runExport}
        busy={exporting}
      />
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
