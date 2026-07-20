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
  /** Band-notes row above chords (room for 2 lines without hitting measure #s). */
  notesRow: 56,
  /** Space between staff bottom and first lyric baseline. */
  lyricGap: 48,
  /** Extra top pad when section label sits above the system (stage). */
  sectionLabelAbove: 0,
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
  /** Staff / barline stroke weight. */
  strokeStaff: 1.4,
  strokeBar: 1.4,
  strokeBarThick: 4,
  strokeSlash: 2.6,
} as const;

export type EngravingUnits = { -readonly [K in keyof typeof UNIT]: number };

/**
 * Live / stage: larger chords, lyrics, notes; section labels go above
 * (see sectionLabelAbove) so the staff can use full width.
 */
export const STAGE_UNIT: EngravingUnits = {
  staffLine: 14,
  staffHeight: 56,
  chordRow: 78,
  notesRow: 72,
  lyricGap: 58,
  sectionLabelAbove: 52,
  fontTitle: 68,
  fontArtist: 30,
  fontMeta: 26,
  fontChord: 46,
  fontLyric: 44,
  fontRehearsal: 30,
  fontMeasureNo: 28,
  fontMarker: 26,
  fontSection: 36,
  fontNotes: 38,
  fontTimeSig: 32,
  lyricCharWidth: 0.5,
  maxLyricWrapLines: 2,
  strokeStaff: 2.6,
  strokeBar: 2.2,
  strokeBarThick: 5.5,
  strokeSlash: 3.6,
};

export const SERIF = "Georgia, 'Times New Roman', Times, serif";
export const SERIF_ITALIC = SERIF;
