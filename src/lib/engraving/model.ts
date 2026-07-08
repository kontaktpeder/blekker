/**
 * Engraving model — the internal representation of a chart after
 * normalization. The layout engine and renderers consume this;
 * they do NOT read the Song directly.
 */

export type SlashPattern = "slashes" | "simile" | "rest";

export interface ChordEvent {
  /** 1-based beat within the measure where this chord starts. */
  beat: number;
  /** Chord symbol already transposed (e.g. "Am7", "G/B", "N.C."). */
  symbol: string;
}

export type MarkerKind =
  | "repeat-start"
  | "repeat-end"
  | "repeat-count"
  | "segno"
  | "coda"
  | "to-coda"
  | "d.c."
  | "d.s."
  | "fine"
  | "fermata"
  | "text";

export interface Marker {
  kind: MarkerKind;
  /** Optional text (e.g. "x4", "D.C. al Fine", "N.C."). */
  text?: string;
}

export interface Measure {
  /** Absolute bar number in the piece. */
  number: number;
  beats: number;
  chords: ChordEvent[];
  slash: SlashPattern;
  /** Free-form musical markers placed above this measure. */
  markers: Marker[];
  /** True if this measure ends the section (used for barline styling). */
  endsSection: boolean;
}

export interface EngravedSection {
  id: string;
  /** Rehearsal label ("Verse", "Chorus", …). */
  label: string;
  /** e.g. "x4" — becomes a repeat marker on the last bar. */
  repeat?: number;
  notes?: string;
  lyrics?: string;
  measures: Measure[];
}

export interface ScoreHeader {
  title: string;
  artist?: string;
  key: string;
  bpm: number;
  timeSig: string;
  capo?: number;
  feel?: string;
}

export interface NormalizedScore {
  header: ScoreHeader;
  sections: EngravedSection[];
  /** Total bar count for numbering / final barline detection. */
  totalMeasures: number;
}
