import { SECTION_COLOR, transposeChord, type Section } from "@/lib/music";
import { cn } from "@/lib/utils";

interface Props {
  section: Section;
  semitones: number;
  showLyrics: boolean;
  showNotes: boolean;
  mode: "full" | "chart" | "live";
}

/** Lead-sheet structure (bars + chords above + optional slashes) in Blekker dark CSS. */
export function SectionCard({ section, semitones, showLyrics, showNotes, mode }: Props) {
  const color = SECTION_COLOR[section.type];
  const liveLg = mode === "live";
  const chartOnly = mode === "chart";

  return (
    <section
      className={cn(
        "relative rounded-xl border bg-card/60 backdrop-blur-sm",
        liveLg ? "p-3 md:p-6" : "p-3 md:p-5",
      )}
    >
      <span
        aria-hidden
        className="absolute left-0 top-4 bottom-4 w-1 rounded-r"
        style={{ background: color }}
      />

      <header className="flex items-baseline justify-between gap-4 pl-3">
        <div className="flex items-baseline gap-3">
          <h3
            className={cn(
              "font-semibold tracking-tight uppercase",
              liveLg ? "text-2xl md:text-4xl" : "text-lg md:text-xl",
            )}
            style={{ color }}
          >
            {section.name}
          </h3>
          {section.repeat && section.repeat > 1 && (
            <span className="text-xs md:text-sm font-mono text-muted-foreground">
              ×{section.repeat}
            </span>
          )}
        </div>
        <span className="font-mono text-xs md:text-sm text-muted-foreground tabular-nums">
          {section.bars} bars
        </span>
      </header>

      {showNotes && section.notes && (
        <p
          className={cn(
            "mt-3 pl-3 italic text-muted-foreground border-l-2 border-border/80 ml-3 pl-3",
            liveLg ? "text-lg md:text-xl" : "text-sm md:text-base",
          )}
        >
          {section.notes}
        </p>
      )}

      <div className="mt-4 pl-3">
        {chartOnly ? (
          <ChordGrid section={section} semitones={semitones} liveLg={false} />
        ) : (
          <LeadBars section={section} semitones={semitones} liveLg={liveLg} />
        )}
      </div>

      {showLyrics && section.lyrics && (
        <p
          className={cn(
            "mt-5 pl-3 whitespace-pre-line font-light text-foreground/90 leading-snug",
            liveLg ? "text-2xl md:text-3xl" : "text-base md:text-lg",
          )}
        >
          {section.lyrics}
        </p>
      )}
    </section>
  );
}

function ChordGrid({
  section,
  semitones,
  liveLg,
}: {
  section: Section;
  semitones: number;
  liveLg: boolean;
}) {
  return (
    <div className="chord-grid">
      {section.chords.map((c, i) => (
        <div
          key={i}
          className={cn(
            "flex items-center justify-center rounded-md border border-border/60 bg-background/40 font-mono font-semibold tabular-nums px-1 text-center leading-none break-all",
            liveLg ? "h-16 md:h-24 text-xl md:text-4xl" : "h-12 md:h-14 text-base md:text-xl",
          )}
          style={{ color: c === "%" || c === "-" ? "var(--muted-foreground)" : "var(--chord)" }}
        >
          {transposeChord(c, semitones)}
        </div>
      ))}
    </div>
  );
}

/** One row of measures: chord on top, slash/simile “staff” underneath — lead sheet structure. */
function LeadBars({
  section,
  semitones,
  liveLg,
}: {
  section: Section;
  semitones: number;
  liveLg: boolean;
}) {
  const chords =
    section.chords.length > 0
      ? section.chords
      : Array.from({ length: Math.max(1, section.bars) }, () => "-");

  return (
    <div
      className={cn(
        "grid gap-0 border border-border/70 rounded-lg overflow-hidden bg-background/30",
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
              "flex flex-col border-border/50",
              i % 2 !== 0 && "border-l",
              "sm:border-l sm:[&:nth-child(4n+1)]:border-l-0",
              i >= 2 && "border-t sm:border-t-0",
              "sm:[&:nth-child(n+5)]:border-t",
            )}
          >
            <div
              className={cn(
                "flex items-end px-2 pt-2 pb-1 font-mono font-semibold tabular-nums leading-none break-all min-h-[2rem]",
                liveLg ? "text-xl md:text-3xl min-h-[2.75rem] px-3 pt-3" : "text-base md:text-xl",
              )}
              style={{ color: muted ? "var(--muted-foreground)" : "var(--chord)" }}
            >
              {isRest ? "—" : c}
            </div>
            <div
              className={cn(
                "flex items-center justify-around px-2 pb-2 pt-1 border-t border-border/40",
                liveLg ? "h-10 md:h-12" : "h-8 md:h-9",
              )}
              aria-hidden
            >
              {isSimile ? (
                <span className="font-mono text-muted-foreground text-lg md:text-xl">%</span>
              ) : isRest ? (
                <span className="w-5 h-2 rounded-sm bg-muted-foreground/50" />
              ) : (
                [0, 1, 2, 3].map((b) => (
                  <span
                    key={b}
                    className={cn(
                      "inline-block rotate-[28deg] rounded-full bg-muted-foreground/70",
                      liveLg ? "w-[3px] h-5 md:h-6" : "w-[2.5px] h-4",
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
