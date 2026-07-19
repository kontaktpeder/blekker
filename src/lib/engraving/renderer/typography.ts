/**
 * Engraving unit conventions. 1 unit = 0.1mm so viewBox 2100×2970 = A4.
 */
export const UNIT = {
  /** Staff line spacing (distance between two adjacent lines). */
  staffLine: 12,
  /** Height of the 5-line staff (4 gaps × staffLine). */
  staffHeight: 48,
  /** Chord label row height above the staff. */
  chordRow: 52,
  /** Rehearsal / marker / section-notes row above chords. */
  markerRow: 44,
  /** Space between staff bottom and lyric baseline. */
  lyricGap: 34,
  /** Font sizes (px in SVG user units). */
  fontTitle: 62,
  fontArtist: 26,
  fontMeta: 22,
  fontChord: 28,
  fontLyric: 20,
  fontRehearsal: 26,
  fontMeasureNo: 18,
  fontMarker: 20,
  fontSection: 28,
  fontNotes: 18,
} as const;

export const SERIF = "Georgia, 'Times New Roman', Times, serif";
export const SERIF_ITALIC = SERIF;
