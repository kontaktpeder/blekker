import { useEffect, useMemo, useRef, useState } from "react";
import {
  Minus,
  Plus,
  Eye,
  EyeOff,
  Maximize2,
  X,
  Play,
  Pause,
  Download,
  Pencil,
  Check,
} from "lucide-react";
import { transposeKey, type Section, type Song } from "@/lib/music";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SectionCard } from "./SectionCard";
import { FormStrip } from "./FormStrip";
import { exportChartPdf } from "@/lib/pdf/exportChartPdf";
import { ExportDialog } from "./ExportDialog";
import type { ExportFormat, ExportLayout, LeadSheetVariant } from "@/lib/pdf/layouts";
import { useUpdateSong } from "@/hooks/useSongs";
import { toast } from "sonner";
import { resolvePlayOrder } from "@/lib/ug-form";

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
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Song>(song);
  const scrollRef = useRef<HTMLDivElement>(null);
  const updateSong = useUpdateSong();

  useEffect(() => {
    setDraft(song);
    setEditing(false);
  }, [song.id]);

  const working = editing ? draft : song;
  const play = useMemo(() => resolvePlayOrder(working), [working]);
  const displayKey = useMemo(
    () => transposeKey(working.key, semitones),
    [working.key, semitones],
  );
  const isLive = mode === "live";
  const showNotes = mode === "full" || mode === "live";
  const lyricsOn = showLyrics && (mode === "full" || mode === "live");
  const canEdit = mode === "full" && editing;

  useEffect(() => {
    if (!isLive || scrollSpeed === 0) return;
    const el = scrollRef.current;
    if (!el) return;
    const pxPerSec = scrollSpeed === 1 ? 24 : scrollSpeed === 2 ? 52 : 96;
    let raf = 0;
    let last = performance.now();
    /** While the user is scrolling, freeze auto-advance; resume from their position. */
    let pauseUntil = 0;
    let writing = false;
    const pauseForUser = () => {
      pauseUntil = performance.now() + 600;
    };
    const onScroll = () => {
      if (writing) return;
      pauseForUser();
    };

    el.addEventListener("wheel", pauseForUser, { passive: true });
    el.addEventListener("touchstart", pauseForUser, { passive: true });
    el.addEventListener("touchmove", pauseForUser, { passive: true });
    el.addEventListener("pointerdown", pauseForUser);
    el.addEventListener("scroll", onScroll, { passive: true });

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const max = Math.max(0, el.scrollHeight - el.clientHeight);
      if (now >= pauseUntil) {
        writing = true;
        el.scrollTop = Math.min(el.scrollTop + pxPerSec * dt, max);
        writing = false;
      }
      if (el.scrollTop >= max - 1) return;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("wheel", pauseForUser);
      el.removeEventListener("touchstart", pauseForUser);
      el.removeEventListener("touchmove", pauseForUser);
      el.removeEventListener("pointerdown", pauseForUser);
      el.removeEventListener("scroll", onScroll);
    };
  }, [isLive, scrollSpeed]);

  useEffect(() => {
    if (!isLive) setScrollSpeed(0);
  }, [isLive]);

  useEffect(() => {
    if (mode !== "full" && editing) setEditing(false);
  }, [mode, editing]);

  async function runExport(opts: { format: ExportFormat; layout: ExportLayout; variant?: LeadSheetVariant }) {
    if (exporting) return;
    setExporting(true);
    const t = toast.loading(opts.format === "pdf" ? "Lager PDF…" : "Lager ark…");
    try {
      await exportChartPdf({
        song: { ...working, form: play.form, sections: play.sections },
        semitones,
        showLyrics,
        ...opts,
      });
      toast.success(opts.format === "pdf" ? "PDF klar" : "Ark klare", { id: t });
      setExportOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Kunne ikke eksportere", { id: t });
    } finally {
      setExporting(false);
    }
  }

  function patchSection(id: string, next: Section) {
    setDraft((d) => ({
      ...d,
      sections: d.sections.map((s) => (s.id === id ? next : s)),
      form: d.sections.map((s) => (s.id === id ? next.name : s.name)),
    }));
  }

  async function saveEdits() {
    const t = toast.loading("Lagrer…");
    try {
      await updateSong.mutateAsync({
        id: draft.id,
        title: draft.title,
        artist: draft.artist,
        key: draft.key,
        bpm: draft.bpm,
        capo: draft.capo ?? 0,
        sections: draft.sections.map((s) => ({
          id: s.id,
          type: s.type,
          name: s.name,
          bars: s.bars,
          chords: s.chords,
          lyrics: s.lyrics ?? null,
          notes: s.notes ?? null,
          repeat: s.repeat ?? null,
        })),
      });
      setEditing(false);
      toast.success("Lagret", { id: t });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kunne ikke lagre", { id: t });
    }
  }

  function startEditing() {
    setDraft(song);
    setMode("full");
    setEditing(true);
  }

  function cancelEditing() {
    setDraft(song);
    setEditing(false);
  }

  return (
    <div className={cn("flex flex-col h-full", isLive && "fixed inset-0 z-50 bg-background")}>
      {!isLive && (
        <header className="border-b border-border/70 bg-background/80 backdrop-blur-md px-5 md:px-8 py-4">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="min-w-0 flex-1">
              {canEdit ? (
                <div className="space-y-2 max-w-xl">
                  <input
                    value={draft.title}
                    onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                    className="w-full bg-background/60 border border-border rounded-md px-3 py-2 font-semibold tracking-tight text-2xl md:text-4xl outline-none focus:ring-1 focus:ring-primary"
                  />
                  <input
                    value={draft.artist}
                    onChange={(e) => setDraft((d) => ({ ...d, artist: e.target.value }))}
                    className="w-full bg-background/60 border border-border rounded-md px-3 py-1.5 font-mono uppercase tracking-[0.18em] text-xs md:text-sm text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              ) : (
                <>
                  <h1 className="font-semibold tracking-tight leading-none text-balance text-2xl md:text-4xl">
                    {working.title}
                  </h1>
                  <p className="mt-2 font-mono uppercase tracking-[0.18em] text-muted-foreground text-xs md:text-sm">
                    {working.artist}
                  </p>
                </>
              )}
            </div>

            <div className="flex items-center gap-3 md:gap-5 rounded-lg border border-border bg-card/60 px-4 py-2 font-mono tabular-nums text-sm md:text-base">
              {canEdit ? (
                <>
                  <label className="flex flex-col gap-1">
                    <span className="text-[9px] text-muted-foreground tracking-[0.2em]">KEY</span>
                    <input
                      value={draft.key}
                      onChange={(e) => setDraft((d) => ({ ...d, key: e.target.value }))}
                      className="w-16 bg-background/60 border border-border rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-primary"
                    />
                  </label>
                  <div className="ticker-divider" />
                  <label className="flex flex-col gap-1">
                    <span className="text-[9px] text-muted-foreground tracking-[0.2em]">BPM</span>
                    <input
                      type="number"
                      value={draft.bpm}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, bpm: parseInt(e.target.value, 10) || d.bpm }))
                      }
                      className="w-16 bg-background/60 border border-border rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-primary"
                    />
                  </label>
                  <div className="ticker-divider" />
                  <label className="flex flex-col gap-1">
                    <span className="text-[9px] text-muted-foreground tracking-[0.2em]">CAPO</span>
                    <input
                      type="number"
                      min={0}
                      max={12}
                      value={draft.capo ?? 0}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, capo: parseInt(e.target.value, 10) || 0 }))
                      }
                      className="w-14 bg-background/60 border border-border rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-primary"
                    />
                  </label>
                </>
              ) : (
                <>
                  <Meta label="KEY" value={displayKey} />
                  <div className="ticker-divider" />
                  <Meta label="BPM" value={String(working.bpm)} />
                  <div className="ticker-divider" />
                  <Meta label="CAPO" value={working.capo ? String(working.capo) : "—"} />
                  {working.timeSig && (
                    <>
                      <div className="ticker-divider hidden md:block" />
                      <div className="hidden md:block">
                        <Meta label="TIME" value={working.timeSig} />
                      </div>
                    </>
                  )}
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

            {!canEdit && (
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
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLyrics((v) => !v)}
              className="font-mono uppercase tracking-wider text-xs"
            >
              {showLyrics ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              <span className="ml-2">Lyrics</span>
            </Button>

            {mode === "full" && (
              canEdit ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={cancelEditing}
                    className="font-mono uppercase tracking-wider text-xs"
                    disabled={updateSong.isPending}
                  >
                    Avbryt
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={saveEdits}
                    disabled={updateSong.isPending}
                    className="font-mono uppercase tracking-wider text-xs"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    {updateSong.isPending ? "Lagrer…" : "Lagre"}
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startEditing}
                  className="font-mono uppercase tracking-wider text-xs"
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Rediger
                </Button>
              )
            )}

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

      {isLive && (
        <div className="absolute top-4 right-4 z-10 flex flex-wrap items-center justify-end gap-2 rounded-lg border border-border bg-background/80 backdrop-blur-md px-3 py-2 font-mono max-w-[calc(100%-2rem)]">
          <div className="flex items-center gap-3 px-2 tabular-nums text-sm">
            <span>
              <span className="text-muted-foreground text-[10px] tracking-[0.2em] mr-1">KEY</span>
              {displayKey}
            </span>
            <span>
              <span className="text-muted-foreground text-[10px] tracking-[0.2em] mr-1">BPM</span>
              {working.bpm}
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
              {working.title}
            </h1>
            <p className="mt-2 font-mono uppercase tracking-[0.18em] text-muted-foreground text-base">
              {working.artist}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3 md:gap-5 rounded-lg border border-border bg-card/60 px-4 py-2 font-mono tabular-nums text-sm md:text-base w-fit">
              <Meta label="KEY" value={displayKey} />
              <div className="ticker-divider" />
              <Meta label="BPM" value={String(working.bpm)} />
              <div className="ticker-divider" />
              <Meta label="CAPO" value={working.capo ? String(working.capo) : "—"} />
              {working.timeSig && (
                <>
                  <div className="ticker-divider" />
                  <Meta label="TIME" value={working.timeSig} />
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
            <FormStrip form={play.form} large={isLive} />
          </div>
        )}

        {mode === "form" ? null : (
          <div className={cn("grid gap-4", isLive ? "gap-6" : "md:gap-5")}>
            {play.sections.map((s) => (
              <SectionCard
                key={s.id}
                section={s}
                semitones={canEdit ? 0 : semitones}
                showLyrics={lyricsOn}
                showNotes={showNotes}
                mode={isLive ? "live" : mode === "chart" ? "chart" : "full"}
                editing={canEdit}
                onChange={canEdit ? (next) => patchSection(s.id, next) : undefined}
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
