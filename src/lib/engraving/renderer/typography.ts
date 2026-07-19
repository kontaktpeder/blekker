/**
 * Engraving unit conventions. 1 unit = 0.1mm so viewBox 2100×2970 = A4.
 * Sized for stand readability on 2-page band charts — prefer larger type
 * over cramming; pagination should make room, not shrink fonts.
 */
export const UNIT = {
  /** Staff line spacing (distance between two adjacent lines). */
  staffLine: 12,
  /** Height of the 5-line staff (4 gaps × staffLine). */
  staffHeight: 48,
  /** Chord label row height above the staff. */
  chordRow: 56,
  /** Band-notes row above chords. */
  notesRow: 44,
  /** Space between staff bottom and first lyric baseline. */
  lyricGap: 48,
  /** Font sizes (px in SVG user units). */
  fontTitle: 58,
  fontArtist: 26,
  fontMeta: 22,
  fontChord: 32,
  fontLyric: 34,
  fontRehearsal: 26,
  fontMeasureNo: 22,
  fontMarker: 22,
  fontSection: 28,
  /** Performance notes above the staff — must stay readable on a stand. */
  fontNotes: 28,
  fontTimeSig: 28,
  /** Approx italic-serif advance width factor for wrap estimates. */
  lyricCharWidth: 0.5,
  /** Max wrapped lyric lines under one system. */
  maxLyricWrapLines: 2,
} as const;

export const SERIF = "Georgia, 'Times New Roman', Times, serif";
export const SERIF_ITALIC = SERIF;
