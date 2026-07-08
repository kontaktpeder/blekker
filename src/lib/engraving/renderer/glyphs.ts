/**
 * Hand-authored SVG path glyphs for musical symbols.
 * Coordinates are designed so the glyph's natural bounding box origin
 * is at (0,0); callers translate into position.
 *
 * Style: monochrome, no fills except where stated. Optimized for
 * rasterization at 96–150 DPI.
 */

/** Treble clef — simplified stylized shape, height ~90 units, sits on staff. */
export const TREBLE_CLEF_PATH =
  "M22 -30 C22 -50 8 -58 -2 -50 C-14 -40 -14 -18 0 -8 C18 6 34 22 34 42 C34 62 18 74 4 74 C-8 74 -18 66 -18 54 C-18 44 -10 40 -2 40 C6 40 12 44 12 52 M6 -30 L6 62 M6 62 C6 76 -4 82 -12 78";

/** Sharp glyph, height ~28, origin at note-line center (middle of glyph). */
export const SHARP_PATH =
  "M-5 -14 L-5 14 M5 -18 L5 10 M-8 -6 L8 -10 M-8 6 L8 2";

/** Flat glyph. */
export const FLAT_PATH =
  "M-4 -18 L-4 14 M-4 6 C0 -2 8 -2 8 4 C8 10 2 14 -4 14";

/** Segno symbol. */
export const SEGNO_PATH =
  "M-14 12 C-14 -14 14 -14 14 4 C14 20 -14 20 -14 -6 M-18 -10 L18 12 M-14 -14 A2 2 0 1 0 -14 -13 M14 12 A2 2 0 1 0 14 13";

/** Coda symbol — circle + cross. */
export const CODA_PATH =
  "M0 0 m -18 0 a 18 18 0 1 0 36 0 a 18 18 0 1 0 -36 0 M-24 0 L24 0 M0 -24 L0 24";

/** Fermata — arc with a dot. */
export const FERMATA_PATH =
  "M-16 6 C-16 -14 16 -14 16 6 M0 -4 a 2 2 0 1 0 0.1 0";

/** Sharps and flats to draw per key signature (canonical order). */
export const KEY_ACCIDENTALS: Record<string, { type: "sharp" | "flat"; count: number }> = {
  C: { type: "sharp", count: 0 },
  G: { type: "sharp", count: 1 },
  D: { type: "sharp", count: 2 },
  A: { type: "sharp", count: 3 },
  E: { type: "sharp", count: 4 },
  B: { type: "sharp", count: 5 },
  "F#": { type: "sharp", count: 6 },
  "C#": { type: "sharp", count: 7 },
  F: { type: "flat", count: 1 },
  Bb: { type: "flat", count: 2 },
  Eb: { type: "flat", count: 3 },
  Ab: { type: "flat", count: 4 },
  Db: { type: "flat", count: 5 },
  Gb: { type: "flat", count: 6 },
  Cb: { type: "flat", count: 7 },
};

/**
 * Y offsets (from staff top) for sharps in canonical order F# C# G# D# A# E# B#.
 * Staff line spacing is 12 units in our unit system (staff spans y=0..48).
 */
export const SHARP_STAFF_STEPS = [0, 9, -3, 6, 15, 3, 12]; // in half-steps from top line
export const FLAT_STAFF_STEPS = [9, 3, 12, 6, 15, 9, 18];

/** Convert a "step from top line" into y (line spacing = 6). */
export function stepToY(step: number, lineSpacing: number): number {
  return (step * lineSpacing) / 2;
}
