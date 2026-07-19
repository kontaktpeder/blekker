/**
 * Engraving unit conventions. 1 unit = 0.1mm so viewBox 2100×2970 = A4.
 */
export const UNIT = {
  /** Staff line spacing (distance between two adjacent lines). */
  staffLine: 12,
  /** Height of the 5-line staff (4 gaps × staffLine). */
  staffHeight: 48,
  /** Chord label row height above the staff. */
  chordRow: 50,
  /** Band-notes row above chords. */
  notesRow: 36,
  /** Space between staff bottom and lyric baseline. */
  lyricGap: 52,
  /** Font sizes (px in SVG user units). */
  fontTitle: 56,
  fontArtist: 24,
  fontMeta: 20,
  fontChord: 28,
  fontLyric: 28,
  fontRehearsal: 24,
  fontMeasureNo: 16,
  fontMarker: 20,
  fontSection: 24,
  /** Performance notes above the staff — must stay readable on a stand. */
  fontNotes: 24,
  fontTimeSig: 26,
} as const;

export const SERIF = "Georgia, 'Times New Roman', Times, serif";
export const SERIF_ITALIC = SERIF;
