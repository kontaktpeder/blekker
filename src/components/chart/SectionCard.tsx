import { SECTION_COLOR, transposeChord, type Section } from "@/lib/music";
import { cn } from "@/lib/utils";

interface Props {
  section: Section;
  semitones: number;
  showLyrics: boolean;
  showNotes: boolean;
  mode: "full" | "chart" | "live";
}

export function SectionCard({ section, semitones, showLyrics, showNotes, mode }: Props) {
  const color = SECTION_COLOR[section.type];
  const liveLg = mode === "live";

  return (
    <section
      className={cn(
        "relative rounded-xl border bg-card/60 backdrop-blur-sm",
        liveLg ? "p-8 md:p-12" : "p-5 md:p-7"
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
              liveLg ? "text-3xl md:text-4xl" : "text-lg md:text-xl"
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

      <div className="mt-4 pl-3">
        <div className="chord-grid">
          {section.chords.map((c, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center justify-center rounded-md border border-border/60 bg-background/40 font-mono font-semibold tabular-nums",
                liveLg ? "h-20 md:h-24 text-3xl md:text-5xl" : "h-12 md:h-14 text-xl md:text-2xl"
              )}
              style={{ color: c === "%" || c === "-" ? "var(--muted-foreground)" : "var(--chord)" }}
            >
              {transposeChord(c, semitones)}
            </div>
          ))}
        </div>
      </div>

      {showLyrics && section.lyrics && (
        <p
          className={cn(
            "mt-5 pl-3 whitespace-pre-line font-light text-foreground/90 text-balance leading-snug",
            liveLg ? "text-2xl md:text-3xl" : "text-base md:text-lg"
          )}
        >
          {section.lyrics}
        </p>
      )}

      {showNotes && section.notes && (
        <div className={cn("mt-4 pl-3 flex gap-2", liveLg && "mt-6")}>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground pt-1">
            Note
          </span>
          <p
            className={cn(
              "italic text-muted-foreground",
              liveLg ? "text-xl" : "text-sm md:text-base"
            )}
          >
            {section.notes}
          </p>
        </div>
      )}
    </section>
  );
}
