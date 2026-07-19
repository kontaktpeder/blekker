import { useMemo } from "react";
import type { Song } from "@/lib/music";
import {
  isChordLine,
  isSectionHeader,
  resolveLyricSheetText,
} from "@/lib/lyric-sheet";
import { cn } from "@/lib/utils";

interface Props {
  song: Song;
  semitones: number;
  /** Relative font step, like UG print −1 / +1 (0 = default). */
  fontStep?: number;
  className?: string;
  paper?: boolean;
}

export function LyricSheet({
  song,
  semitones,
  fontStep = 0,
  className,
  paper = true,
}: Props) {
  const { text, fromSource } = useMemo(
    () => resolveLyricSheetText(song, semitones),
    [song, semitones],
  );

  const lines = useMemo(() => text.split("\n"), [text]);
  const fontSize = Math.max(12, Math.min(28, 16 + fontStep * 2));

  return (
    <div
      className={cn(
        "lyric-sheet w-full max-w-3xl mx-auto",
        paper && "lyric-sheet--paper rounded-sm px-6 py-8 md:px-10 md:py-12",
        className,
      )}
    >
      <header className="mb-8">
        <h1 className="font-bold tracking-tight text-[1.35em] leading-tight text-black">
          {song.title}
        </h1>
        {song.artist && song.artist !== "—" && (
          <p className="mt-1 text-[0.85em] text-neutral-600">{song.artist}</p>
        )}
      </header>

      <div
        className="lyric-sheet__body font-mono text-black leading-[1.65]"
        style={{ fontSize }}
      >
        {lines.map((line, i) => {
          const empty = line.length === 0;
          const chord = !empty && isChordLine(line);
          const header = !empty && isSectionHeader(line);
          return (
            <div
              key={i}
              className={cn(
                "whitespace-pre-wrap break-words",
                empty && "h-[0.85em]",
                chord && "font-bold",
                header && "font-semibold mt-3 first:mt-0",
              )}
            >
              {empty ? "\u00a0" : line}
            </div>
          );
        })}
      </div>

      {!fromSource && (
        <p className="mt-8 font-mono text-[10px] uppercase tracking-widest text-neutral-400">
          Generated from chart — paste UG/ChordPro text when creating for syllable alignment
        </p>
      )}
    </div>
  );
}
