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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { transposeKey, type Section, type Song } from "@/lib/music";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SectionCard } from "./SectionCard";
import { FormStrip } from "./FormStrip";
import { LiveLeadSheet } from "./LiveLeadSheet";
import { exportChartPdf } from "@/lib/pdf/exportChartPdf";
import { ExportDialog } from "./ExportDialog";
import type { ExportFormat, ExportLayout, LeadSheetVariant } from "@/lib/pdf/layouts";
import { useUpdateSong } from "@/hooks/useSongs";
import { toast } from "sonner";
import { resolvePlayOrder } from "@/lib/ug-form";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "@/lib/theme";

type ViewMode = "full" | "chart" | "form" | "live";

const MODES: { id: ViewMode; label: string }[] = [
  { id: "full", label: "Full" },
  { id: "chart", label: "Chart" },
  { id: "form", label: "Form" },
  { id: "live", label: "Live" },
];

/** Compact row used for setlist live navigation HUD. */
export type SetlistLiveItem = {
  id: string;
  title: string;
  artist: string;
  key: string;
  bpm: number;
  capo?: number;
};

export type SetlistLiveProps = {
  items: SetlistLiveItem[];
  index: number;
  onGoTo: (index: number) => void;
  onExitLive?: () => void;
};

interface Props {
  song: Song;
  /** Open directly in Live (setlist session). */
  initialMode?: ViewMode;
  setlistLive?: SetlistLiveProps;
}

export function SongChart({ song, initialMode = "full", setlistLive }: Props) {
  const { theme: appTheme } = useTheme();
  const liveChartTheme = appTheme === "light" ? "paper" : "stage";
  const [mode, setMode] = useState<ViewMode>(initialMode);
  const [semitones, setSemitones] = useState(0);
  const [showLyrics, setShowLyrics] = useState(true);
  const [scrollSpeed, setScrollSpeed] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Song>(song);
  const scrollRef = useRef<HTMLDivElement>(null);
  const liveShellRef = useRef<HTMLDivElement>(null);
  const transposeBySong = useRef<Record<string, number>>({});
  const updateSong = useUpdateSong();

  useEffect(() => {
    setDraft(song);
    setEditing(false);
    setSemitones(transposeBySong.current[song.id] ?? 0);
    setScrollSpeed(0);
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    });
  }, [song.id]);

  useEffect(() => {
    transposeBySong.current[song.id] = semitones;
  }, [song.id, semitones]);


  useEffect(() => {
    if (initialMode === "live") setMode("live");
  }, [initialMode]);

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

  const setlistIdx = setlistLive?.index ?? -1;
  const setlistLen = setlistLive?.items.length ?? 0;
  const hasSetlist = !!setlistLive && setlistLen > 0;
  const prevItem = hasSetlist && setlistIdx > 0 ? setlistLive!.items[setlistIdx - 1] : null;
  const nextItem =
    hasSetlist && setlistIdx >= 0 && setlistIdx < setlistLen - 1
      ? setlistLive!.items[setlistIdx + 1]
      : null;

  function goSetlist(dir: -1 | 1) {
    if (!setlistLive) return;
    const next = setlistLive.index + dir;
    if (next < 0 || next >= setlistLive.items.length) return;
    setScrollSpeed(0);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setlistLive.onGoTo(next);
  }

  const goSetlistRef = useRef(goSetlist);
  goSetlistRef.current = goSetlist;

  function exitLive() {
    setMode("full");
    setlistLive?.onExitLive?.();
  }

  // Horizontal swipe on Live shell: left → next, right → previous (page-turn).
  useEffect(() => {
    if (!isLive || !hasSetlist) return;
    const el = liveShellRef.current;
    if (!el) return;
    let startX = 0;
    let startY = 0;
    let tracking = false;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      tracking = true;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    const onEnd = (e: TouchEvent) => {
      if (!tracking || e.changedTouches.length !== 1) return;
      tracking = false;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      // Prefer clear horizontal intent; lower threshold for iPad.
      if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.15) return;
      if (dx < 0) goSetlistRef.current(1);
      else goSetlistRef.current(-1);
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchend", onEnd);
    };
  }, [isLive, hasSetlist]);

  useEffect(() => {
    if (!isLive || !hasSetlist || !setlistLive) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight" || e.key === "n" || e.key === "N") {
        e.preventDefault();
        const next = setlistLive.index + 1;
        if (next < setlistLive.items.length) setlistLive.onGoTo(next);
      } else if (e.key === "ArrowLeft" || e.key === "p" || e.key === "P") {
        e.preventDefault();
        const prev = setlistLive.index - 1;
        if (prev >= 0) setlistLive.onGoTo(prev);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setMode("full");
        setlistLive.onExitLive?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isLive, hasSetlist, setlistLive]);

  useEffect(() => {
    if (!isLive || scrollSpeed === 0) return;
    const el = scrollRef.current;
    if (!el) return;
    // MED ≈ current working pace; SLOW a notch under; FAST a bit more rise.
    // ~1 viewport in ~4 / 3 / 2 minutes with fractional-px accrual below.
    const pxPerSec = scrollSpeed === 1 ? 5 : scrollSpeed === 2 ? 10 : 15;
    let raf = 0;
    let last = performance.now();
    let carry = 0;
    let pauseUntil = 0;
    const pauseForUser = (e: Event) => {
      // Don't pause for chrome outside the scroll pane (Play/Pause etc.).
      if (e.target instanceof Node && !el.contains(e.target)) return;
      pauseUntil = performance.now() + 600;
    };

    el.addEventListener("wheel", pauseForUser, { passive: true });
    el.addEventListener("touchstart", pauseForUser, { passive: true });
    el.addEventListener("touchmove", pauseForUser, { passive: true });
    el.addEventListener("pointerdown", pauseForUser);

    const tick = (now: number) => {
      const dt = Math.min(0.064, (now - last) / 1000);
      last = now;
      const max = Math.max(0, el.scrollHeight - el.clientHeight);
      if (now >= pauseUntil && max > 0) {
        carry += pxPerSec * dt;
        if (carry >= 1) {
          const step = Math.floor(carry);
          carry -= step;
          el.scrollTop = Math.min(el.scrollTop + step, max);
        }
      }
      if (max > 0 && el.scrollTop >= max - 1) return;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("wheel", pauseForUser);
      el.removeEventListener("touchstart", pauseForUser);
      el.removeEventListener("touchmove", pauseForUser);
      el.removeEventListener("pointerdown", pauseForUser);
    };
  }, [isLive, scrollSpeed, working.id, lyricsOn]);

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
    <div
      ref={isLive ? liveShellRef : undefined}
      className={cn(
        "flex flex-col h-full min-h-0",
        isLive && "fixed inset-0 z-50",
        isLive && "bg-background",
      )}
    >
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
                <Maximize2 className="h-4 w-4 mr-1" />
                {hasSetlist ? "Start Live" : "Live"}
              </Button>
            </div>
          </div>
        </header>
      )}

      {isLive && (
        <>
          {/* Solid chrome — no backdrop-blur (Safari/iPad leaks scroll content through). */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-20 p-3"
            style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
          >
            <div className="pointer-events-auto flex flex-col gap-2 max-w-full md:flex-row md:items-start md:justify-between">
              {hasSetlist && (
                <div className="shrink-0 max-w-full md:max-w-[min(18rem,calc(100%-1rem))] rounded-md border border-border bg-background px-2.5 py-1.5 font-mono shadow-md">
                  <p className="text-[9px] tracking-[0.18em] text-muted-foreground uppercase leading-none">
                    {setlistIdx + 1}/{setlistLen}
                  </p>
                  <p className="mt-1 text-[11px] md:text-xs font-medium text-foreground/90 truncate leading-snug">
                    {working.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground tabular-nums truncate leading-snug">
                    {displayKey} · {working.bpm}
                    {working.capo ? ` · c${working.capo}` : ""}
                  </p>
                  {nextItem && (
                    <p className="mt-1 pt-1 border-t border-border/50 text-[10px] text-muted-foreground/80 truncate leading-snug">
                      <span className="tracking-[0.12em] uppercase mr-1 opacity-70">Neste</span>
                      {nextItem.title}
                    </p>
                  )}
                </div>
              )}

              <div
                className={cn(
                  "flex flex-wrap items-center gap-1 rounded-lg border border-border bg-background px-2 py-1.5 font-mono shadow-lg",
                  "max-w-full md:max-w-[min(36rem,calc(100%-1rem))] md:justify-end",
                  !hasSetlist && "ml-auto",
                )}
              >
                <div className="flex items-center gap-3 px-2 tabular-nums text-sm">
                  <span>
                    <span className="text-muted-foreground text-[10px] tracking-[0.2em] mr-1">KEY</span>
                    {displayKey}
                  </span>
                  <span className="flex items-center gap-2">
                    <TempoPulse bpm={working.bpm} />
                    <span>
                      <span className="text-muted-foreground text-[10px] tracking-[0.2em] mr-1">BPM</span>
                      {working.bpm}
                    </span>
                  </span>
                </div>
                <div className="flex items-center border-l border-border pl-1">
                  <button
                    type="button"
                    onClick={() => setSemitones((s) => s - 1)}
                    className="p-1.5 hover:bg-accent rounded outline-none focus-visible:ring-2 focus-visible:ring-ring [-webkit-tap-highlight-color:transparent]"
                    aria-label="Transpose down"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <div className="px-2 text-xs tabular-nums w-12 text-center">
                    {semitones === 0 ? "±0" : semitones > 0 ? `+${semitones}` : semitones}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSemitones((s) => s + 1)}
                    className="p-1.5 hover:bg-accent rounded outline-none focus-visible:ring-2 focus-visible:ring-ring [-webkit-tap-highlight-color:transparent]"
                    aria-label="Transpose up"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setScrollSpeed((s) => (s + 1) % 4)}
                  className="flex items-center gap-1 px-2 py-1.5 hover:bg-accent rounded border-l border-border ml-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring [-webkit-tap-highlight-color:transparent]"
                  aria-label="Autoscroll speed"
                  title="Autoscroll"
                >
                  {scrollSpeed === 0 ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  <span className="text-[10px] tracking-[0.15em] w-8 text-center">
                    {scrollSpeed === 0 ? "OFF" : scrollSpeed === 1 ? "SLOW" : scrollSpeed === 2 ? "MED" : "FAST"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowLyrics((v) => !v)}
                  className="p-1.5 hover:bg-accent rounded border-l border-border ml-0.5 pl-2 outline-none focus-visible:ring-2 focus-visible:ring-ring [-webkit-tap-highlight-color:transparent] min-h-10 min-w-10 inline-flex items-center justify-center"
                  aria-label="Toggle lyrics"
                >
                  {showLyrics ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <div className="border-l border-border ml-0.5 pl-1.5 flex items-center">
                  <ThemeToggle size="sm" className="shadow-none border-0 rounded-md h-9 w-9" />
                </div>
                <button
                  type="button"
                  onClick={() => setExportOpen(true)}
                  disabled={exporting}
                  className="p-1.5 hover:bg-accent rounded border-l border-border ml-0.5 pl-2 disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-ring [-webkit-tap-highlight-color:transparent] min-h-10 min-w-10 inline-flex items-center justify-center"
                  aria-label="Last ned PDF"
                  title="Last ned PDF"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={exitLive}
                  className="p-1.5 hover:bg-accent rounded border-l border-border ml-0.5 pl-2 outline-none focus-visible:ring-2 focus-visible:ring-ring [-webkit-tap-highlight-color:transparent]"
                  aria-label="Exit live"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {hasSetlist && (
            <div
              className="absolute left-1/2 z-20 -translate-x-1/2 flex items-center gap-0.5 rounded-full border border-border bg-background px-1 py-1 shadow-md max-w-[calc(100%-1.5rem)]"
              style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
            >
              <button
                type="button"
                onClick={() => goSetlist(-1)}
                disabled={!prevItem}
                className="flex items-center justify-center gap-0.5 rounded-full h-11 min-w-11 px-3 hover:bg-accent active:scale-[0.97] transition-[transform,background-color] duration-150 disabled:opacity-25 font-mono text-[10px] tracking-[0.14em] uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring [-webkit-tap-highlight-color:transparent]"
                aria-label="Forrige låt"
              >
                <ChevronLeft className="h-4 w-4 opacity-80" />
                <span className="hidden sm:inline">Forrige</span>
              </button>
              <div className="px-2.5 text-center font-mono tabular-nums text-[11px] text-muted-foreground min-w-[2.75rem]">
                {setlistIdx + 1}
                <span className="opacity-50">/{setlistLen}</span>
              </div>
              <button
                type="button"
                onClick={() => goSetlist(1)}
                disabled={!nextItem}
                className="flex items-center justify-center gap-0.5 rounded-full h-11 min-w-11 px-3 hover:bg-accent active:scale-[0.97] transition-[transform,background-color] duration-150 disabled:opacity-25 font-mono text-[10px] tracking-[0.14em] uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring [-webkit-tap-highlight-color:transparent]"
                aria-label="Neste låt"
              >
                <span className="hidden sm:inline">Neste</span>
                <ChevronRight className="h-4 w-4 opacity-80" />
              </button>
            </div>
          )}
          {hasSetlist && (
            <p
              className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 font-mono text-[9px] tracking-[0.16em] uppercase text-muted-foreground/50"
              style={{ bottom: "max(3.75rem, calc(env(safe-area-inset-bottom) + 2.75rem))" }}
            >
              Sveip ← neste · forrige →
            </p>
          )}
        </>
      )}

      <div
        ref={scrollRef}
        className={cn(
          "flex-1 min-h-0 overflow-y-auto",
          isLive ? "px-1 md:px-2 pb-6 bg-background" : "px-2 md:px-6 py-6",
          isLive && (hasSetlist ? "pt-32 md:pt-20 pb-24" : "pt-24 md:pt-20"),
        )}
      >
        {isLive ? (
          <div
            key={working.id}
            className="mx-auto w-full space-y-4 animate-in fade-in duration-300"
            style={{ maxWidth: 834 }}
          >
            <div>
              <p className="font-mono uppercase tracking-[0.2em] mb-2 text-[10px] text-muted-foreground/70">
                Form
              </p>
              <FormStrip form={play.form} large />
            </div>
            <LiveLeadSheet
              song={working}
              semitones={canEdit ? 0 : semitones}
              showLyrics={lyricsOn}
              theme={liveChartTheme}
            />
          </div>
        ) : (
          <>
            {mode !== "form" && (
              <div className="mb-6">
                <p className="font-mono uppercase tracking-[0.18em] text-muted-foreground mb-3 text-[10px] md:text-xs">
                  Form
                </p>
                <FormStrip form={play.form} />
              </div>
            )}

            {mode === "form" ? null : (
              <div className="grid gap-4 md:gap-5">
                {play.sections.map((s) => (
                  <SectionCard
                    key={s.id}
                    section={s}
                    semitones={canEdit ? 0 : semitones}
                    showLyrics={lyricsOn}
                    showNotes={showNotes}
                    mode={mode === "chart" ? "chart" : "full"}
                    editing={canEdit}
                    onChange={canEdit ? (next) => patchSection(s.id, next) : undefined}
                  />
                ))}
              </div>
            )}
          </>
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

function TempoPulse({ bpm, size = "sm" }: { bpm: number; size?: "sm" | "md" }) {
  const safe = Math.max(40, Math.min(240, bpm || 120));
  const periodSec = 60 / safe;
  const dim = size === "md" ? "h-3.5 w-3.5" : "h-2.5 w-2.5";
  return (
    <span
      className={cn("blekker-tempo-pulse inline-block rounded-full bg-primary shrink-0", dim)}
      style={{ animationDuration: `${periodSec}s` }}
      title={`${safe} BPM`}
      aria-hidden
    />
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
