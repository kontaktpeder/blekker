import { transposeChord, transposeKey, type Song, type Section } from "@/lib/music";
import { resolvePlayOrder } from "@/lib/ug-form";
import type {
  ChordEvent,
  Measure,
  NormalizedScore,
  EngravedSection,
  SlashPattern,
  Marker,
} from "./model";

function beatsFromTimeSig(ts?: string): number {
  if (!ts) return 4;
  const [num] = ts.split("/");
  const n = parseInt(num, 10);
  return Number.isFinite(n) ? n : 4;
}

/**
 * A section's `chords` array is one entry per bar. Each entry may itself
 * hold multiple chords separated by whitespace (e.g. "C G/B") to indicate
 * chord changes within the bar. "%" = simile (repeat previous bar),
 * "-" = whole-bar rest / sustain.
 */
function normalizeSection(
  section: Section,
  semitones: number,
  startBarNumber: number,
  beatsPerBar: number,
  isFinal: boolean,
): EngravedSection {
  const measures: Measure[] = [];
  const rawBars: string[] =
    section.chords.length > 0
      ? section.chords
      : (new Array<string>(section.bars).fill("-"));

  rawBars.forEach((raw, idx) => {
    const barNo = startBarNumber + idx;
    const trimmed = (raw ?? "").trim();
    let slash: SlashPattern = "slashes";
    let chords: ChordEvent[] = [];
    const markers: Marker[] = [];

    if (trimmed === "%") {
      slash = "simile";
    } else if (trimmed === "-" || trimmed === "") {
      slash = "rest";
    } else {
      const tokens = trimmed.split(/\s+/);
      // If any token is N.C. / Tacet / Break / Stop / Hits treat as text marker
      // AND still show slashes underneath.
      const chordTokens: string[] = [];
      tokens.forEach((tok) => {
        const upper = tok.toUpperCase();
        if (["N.C.", "TACET", "BREAK", "STOP", "HITS"].includes(upper)) {
          markers.push({ kind: "text", text: upper === "N.C." ? "N.C." : tok });
        } else {
          chordTokens.push(tok);
        }
      });

      if (chordTokens.length === 0 && markers.length > 0) {
        slash = "rest";
      }

      // Distribute chord tokens across beat positions.
      // 1 chord → beat 1. 2 chords → beats 1 and beatsPerBar/2+1.
      // n chords → evenly across beats.
      if (chordTokens.length > 0) {
        const n = chordTokens.length;
        chords = chordTokens.map((c, i) => {
          const beat = Math.round(1 + (i * beatsPerBar) / Math.max(1, n));
          return {
            beat: Math.min(beatsPerBar, Math.max(1, beat)),
            symbol: transposeChord(c, semitones),
          };
        });
      }
    }

    measures.push({
      number: barNo,
      beats: beatsPerBar,
      chords,
      slash,
      markers,
      endsSection: idx === rawBars.length - 1,
    });
  });

  // Section-level repeat → start/end repeat barlines (+ ×N above the end).
  if (section.repeat && section.repeat > 1 && measures.length > 0) {
    measures[0].markers.push({ kind: "repeat-start" });
    measures[measures.length - 1].markers.push({
      kind: "repeat-end",
      text: `×${section.repeat}`,
    });
  }

  // Fine marker on very last bar of the piece.
  if (isFinal && measures.length > 0) {
    // no explicit "Fine" marker unless the section notes contain D.C./D.S.
  }

  return {
    id: section.id,
    label: section.name,
    repeat: section.repeat,
    notes: section.notes,
    lyrics: section.lyrics,
    measures,
  };
}

const NAV_TOKENS: Array<{ re: RegExp; kind: Marker["kind"]; text?: string }> = [
  { re: /\bD\.C\./i, kind: "d.c.", text: "D.C." },
  { re: /\bD\.S\./i, kind: "d.s.", text: "D.S." },
  { re: /\bFine\b/i, kind: "fine", text: "Fine" },
  { re: /\bTo\s*Coda\b/i, kind: "to-coda", text: "To Coda" },
  { re: /\bCoda\b/i, kind: "coda" },
  { re: /\bSegno\b/i, kind: "segno" },
  { re: /\bFermata\b/i, kind: "fermata" },
];

/** Lifts navigation words out of a section's `notes` into structured markers on its final bar. */
function applyNavigationMarkers(sec: EngravedSection) {
  if (!sec.notes || sec.measures.length === 0) return;
  const target = sec.measures[sec.measures.length - 1];
  NAV_TOKENS.forEach(({ re, kind, text }) => {
    if (re.test(sec.notes!)) {
      target.markers.push({ kind, text });
    }
  });
}

export function normalizeSong(song: Song, semitones: number): NormalizedScore {
  const beatsPerBar = beatsFromTimeSig(song.timeSig);
  // Always follow play-order form so repeated UG sections are never dropped in PDF.
  const { sections: ordered } = resolvePlayOrder(song);
  let bar = 1;
  const sections: EngravedSection[] = ordered.map((s, i) => {
    const isFinal = i === ordered.length - 1;
    const norm = normalizeSection(s, semitones, bar, beatsPerBar, isFinal);
    bar += norm.measures.length;
    applyNavigationMarkers(norm);
    return norm;
  });

  return {
    header: {
      title: song.title,
      artist: song.artist,
      key: transposeKey(song.key, semitones),
      bpm: song.bpm,
      timeSig: song.timeSig ?? "4/4",
      capo: song.capo,
    },
    sections,
    totalMeasures: bar - 1,
  };
}
