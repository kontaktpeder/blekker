import { SECTION_COLOR, transposeChord, type Section } from "@/lib/music";
import { localizeBandNotes } from "@/lib/band-notes-no";
import { cn } from "@/lib/utils";

interface Props {
  section: Section;
  semitones: number;
  showLyrics: boolean;
  showNotes: boolean;
  mode: "full" | "chart" | "live";
  editing?: boolean;
  onChange?: (next: Section) => void;
}

/** Lead-sheet structure (bars + chords above + optional slashes) in Blekker dark CSS. */
export function SectionCard({
  section,
  semitones,
  showLyrics,
  showNotes,
  mode,
  editing = false,
  onChange,
}: Props) {
  const color = SECTION_COLOR[section.type];
  const liveLg = mode === "live";
  const canEdit = editing && mode === "full" && !!onChange;

  const patch = (partial: Partial<Section>) => {
    onChange?.({ ...section, ...partial });
  };

  const setChordAt = (index: number, value: string) => {
    const chords = [...section.chords];
    chords[index] = value;
    patch({ chords, bars: Math.max(section.bars, chords.length) });
  };

  const setBarCount = (n: number) => {
    const bars = Math.max(1, Math.min(64, n));
    let chords = [...section.chords];
    if (chords.length < bars) {
      chords = [...chords, ...Array(bars - chords.length).fill("-")];
    } else if (chords.length > bars) {
      chords = chords.slice(0, bars);
    }
    patch({ bars, chords });
  };

  return (
    <section
      className={cn(
        "relative rounded-xl border bg-card/60 backdrop-blur-sm",
        liveLg ? "p-3 md:p-6" : "p-3 md:p-5",
        canEdit && "ring-1 ring-primary/25",
      )}
    >
      <span
        aria-hidden
        className="absolute left-0 top-4 bottom-4 w-1 rounded-r"
        style={{ background: color }}
      />

      <header className="flex items-baseline justify-between gap-4 pl-3">
        <div className="flex items-baseline gap-3 min-w-0 flex-1">
          {canEdit ? (
            <input
              value={section.name}
              onChange={(e) => patch({ name: e.target.value })}
              className="bg-background/60 border border-border rounded-md px-2 py-1 font-semibold tracking-tight uppercase text-lg md:text-xl w-full max-w-xs outline-none focus:ring-1 focus:ring-primary"
              style={{ color }}
            />
          ) : (
            <h3
              className={cn(
                "font-semibold tracking-tight uppercase",
                liveLg ? "text-2xl md:text-4xl" : "text-lg md:text-xl",
              )}
              style={{ color }}
            >
              {section.name}
            </h3>
          )}
          {section.repeat && section.repeat > 1 && (
            <span className="text-xs md:text-sm font-mono text-muted-foreground">
              ×{section.repeat}
            </span>
          )}
        </div>
        {canEdit ? (
          <label className="flex items-center gap-2 font-mono text-xs text-muted-foreground shrink-0">
            <input
              type="number"
              min={1}
              max={64}
              value={section.bars}
              onChange={(e) => setBarCount(parseInt(e.target.value, 10) || 1)}
              className="w-14 bg-background/60 border border-border rounded-md px-2 py-1 tabular-nums outline-none focus:ring-1 focus:ring-primary"
            />
            bars
          </label>
        ) : (
          <span className="font-mono text-xs md:text-sm text-muted-foreground tabular-nums">
            {section.bars} bars
          </span>
        )}
      </header>

      {(showNotes || canEdit) && (section.notes || canEdit) && (
        canEdit ? (
          <textarea
            value={section.notes ?? ""}
            onChange={(e) => patch({ notes: e.target.value || undefined })}
            placeholder="Note (f.eks. halvtempo, kick på alle fire…)"
            rows={2}
            className="mt-3 ml-3 w-[calc(100%-0.75rem)] bg-background/60 border border-border rounded-md px-3 py-2 text-sm italic text-muted-foreground outline-none focus:ring-1 focus:ring-primary resize-y"
          />
        ) : section.notes ? (
          <p
            className={cn(
              "mt-3 pl-3 italic text-muted-foreground border-l-2 border-border/80 ml-3 pl-3",
              liveLg ? "text-lg md:text-xl" : "text-sm md:text-base",
            )}
          >
            {localizeBandNotes(section.notes)}
          </p>
        ) : null
      )}

      <div className="mt-4 pl-3">
        <LeadBars
          section={section}
          semitones={semitones}
          liveLg={liveLg}
          editing={canEdit}
          onChordChange={canEdit ? setChordAt : undefined}
        />
      </div>

      {(showLyrics || canEdit) && (section.lyrics || canEdit) && (
        canEdit ? (
          <textarea
            value={section.lyrics ?? ""}
            onChange={(e) => patch({ lyrics: e.target.value || undefined })}
            placeholder="Lyrics…"
            rows={4}
            className="mt-5 ml-3 w-[calc(100%-0.75rem)] bg-background/60 border border-border rounded-md px-3 py-2 text-base md:text-lg font-light outline-none focus:ring-1 focus:ring-primary resize-y whitespace-pre-line"
          />
        ) : section.lyrics ? (
          <p
            className={cn(
              "mt-5 pl-3 whitespace-pre-line font-light text-foreground/90 leading-snug",
              liveLg ? "text-2xl md:text-3xl" : "text-base md:text-lg",
            )}
          >
            {section.lyrics}
          </p>
        ) : null
      )}
    </section>
  );
}

function LeadBars({
  section,
  semitones,
  liveLg,
  editing,
  onChordChange,
}: {
  section: Section;
  semitones: number;
  liveLg: boolean;
  editing?: boolean;
  onChordChange?: (index: number, value: string) => void;
}) {
  const chords =
    section.chords.length > 0
      ? section.chords
      : Array.from({ length: Math.max(1, section.bars) }, () => "-");

  return (
    <div
      className={cn(
        "grid gap-0 border rounded-lg overflow-hidden bg-background/30",
        liveLg ? "border-border" : "border-border/70",
        "grid-cols-2 sm:grid-cols-4",
        liveLg && "md:grid-cols-4",
      )}
    >
      {chords.map((raw, i) => {
        const c = transposeChord(raw, semitones);
        const isSimile = raw === "%";
        const isRest = raw === "-" || raw === "";
        const muted = isSimile || isRest;
        return (
          <div
            key={i}
            className={cn(
              "flex flex-col",
              liveLg ? "border-border/70" : "border-border/50",
              i % 2 !== 0 && "border-l",
              "sm:border-l sm:[&:nth-child(4n+1)]:border-l-0",
              i >= 2 && "border-t sm:border-t-0",
              "sm:[&:nth-child(n+5)]:border-t",
            )}
          >
            {editing ? (
              <input
                value={raw}
                onChange={(e) => onChordChange?.(i, e.target.value)}
                className={cn(
                  "w-full bg-transparent font-mono font-semibold tabular-nums px-2 pt-2 pb-1 outline-none focus:bg-background/50",
                  liveLg ? "text-xl md:text-3xl min-h-[2.75rem]" : "text-base md:text-xl min-h-[2rem]",
                )}
                style={{ color: "var(--chord)" }}
                spellCheck={false}
              />
            ) : (
              <div
                className={cn(
                  "flex items-end px-2 pt-2 pb-1 font-mono font-semibold tabular-nums leading-none break-all min-h-[2rem]",
                  liveLg ? "text-xl md:text-3xl min-h-[2.75rem] px-3 pt-3" : "text-base md:text-xl",
                )}
                style={{ color: muted ? "var(--muted-foreground)" : "var(--chord)" }}
              >
                {isRest ? "—" : c}
              </div>
            )}
            <div
              className={cn(
                "flex items-center justify-around px-2 pb-2 pt-1 border-t",
                liveLg ? "h-10 md:h-12 border-border/80" : "h-8 md:h-9 border-border/40",
              )}
              aria-hidden
            >
              {isSimile ? (
                <span className={cn("font-mono text-muted-foreground", liveLg ? "text-xl md:text-2xl" : "text-lg md:text-xl")}>%</span>
              ) : isRest ? (
                <span className={cn("rounded-sm bg-muted-foreground/50", liveLg ? "w-6 h-2.5" : "w-5 h-2")} />
              ) : (
                [0, 1, 2, 3].map((b) => (
                  <span
                    key={b}
                    className={cn(
                      "inline-block rotate-[28deg] rounded-full bg-muted-foreground/80",
                      liveLg ? "w-[3.5px] h-5 md:h-7" : "w-[2.5px] h-4",
                    )}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
