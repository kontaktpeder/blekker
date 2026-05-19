export const NOTES_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const NOTES_FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

const ENHARMONIC: Record<string, string> = {
  "Db": "C#", "Eb": "D#", "Gb": "F#", "Ab": "G#", "Bb": "A#",
};

function noteIndex(n: string): number {
  const normalized = ENHARMONIC[n] ?? n;
  const idx = NOTES_SHARP.indexOf(normalized);
  return idx;
}

/** Transpose a chord symbol like "Am7", "F#m", "C/E", "Bbmaj7" by N semitones. */
export function transposeChord(chord: string, semitones: number, preferFlats = false): string {
  if (!chord || chord === "-" || chord === "%") return chord;
  const pool = preferFlats ? NOTES_FLAT : NOTES_SHARP;
  const re = /^([A-G][#b]?)(.*?)(?:\/([A-G][#b]?))?$/;
  const m = chord.match(re);
  if (!m) return chord;
  const [, root, quality, bass] = m;
  const ri = noteIndex(root);
  if (ri < 0) return chord;
  const newRoot = pool[(ri + semitones + 120) % 12];
  let result = newRoot + (quality ?? "");
  if (bass) {
    const bi = noteIndex(bass);
    result += "/" + pool[(bi + semitones + 120) % 12];
  }
  return result;
}

export function transposeKey(key: string, semitones: number): string {
  const minor = key.endsWith("m");
  const root = minor ? key.slice(0, -1) : key;
  return transposeChord(root, semitones) + (minor ? "m" : "");
}

export type SectionType = "intro" | "verse" | "chorus" | "bridge" | "outro" | "interlude" | "solo";

export interface Section {
  id: string;
  type: SectionType;
  name: string;
  bars: number;
  /** Chord per bar. Use "%" for repeat-previous, "-" for sustain. */
  chords: string[];
  lyrics?: string;
  notes?: string;
  repeat?: number;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  key: string;
  bpm: number;
  capo?: number;
  timeSig?: string;
  form: string[]; // e.g. ["Intro", "Verse", "Chorus", ...]
  sections: Section[];
}

export const SECTION_COLOR: Record<SectionType, string> = {
  intro: "var(--color-section-intro)",
  verse: "var(--color-section-verse)",
  chorus: "var(--color-section-chorus)",
  bridge: "var(--color-section-bridge)",
  outro: "var(--color-section-outro)",
  interlude: "var(--color-section-intro)",
  solo: "var(--color-section-bridge)",
};
