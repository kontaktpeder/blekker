import {
  ChordsOverWordsFormatter,
  ChordsOverWordsParser,
  UltimateGuitarParser,
  type Song as ChordSheetSong,
} from "chordsheetjs";
import type { Song } from "./music";
import { transposeChord } from "./music";

const CHORD_TOKEN =
  /^[A-G][#b]?(?:m|maj|min|dim|aug|sus|add|maj7|m7|m9|m11|m13|9|11|13|6|7|2|4|5)*(?:\/[A-G][#b]?)?$/;

/** Prefer chords-over-words (keeps [Chorus] headers); fall back to UG parser. */
export function parseSheetSource(source: string): ChordSheetSong | null {
  const cleaned = cleanSheetSource(source);
  if (!cleaned.trim()) return null;

  try {
    return new ChordsOverWordsParser().parse(cleaned);
  } catch {
    /* try UG parser */
  }
  try {
    return new UltimateGuitarParser().parse(cleaned);
  } catch {
    return null;
  }
}

/** Strip common scrape noise; keep chord/lyric body. */
export function cleanSheetSource(source: string): string {
  let text = source.replace(/\r\n/g, "\n").trim();
  text = text.replace(/\n{4,}/g, "\n\n");
  const sectionIdx = text.search(/\[[^\]]{1,40}\]/m);
  if (sectionIdx > 200) {
    text = text.slice(sectionIdx);
  }
  return text.slice(0, 50000);
}

export function formatLyricSheet(
  source: string,
  semitones: number,
): string | null {
  const parsed = parseSheetSource(source);
  if (!parsed) return null;
  const song = semitones === 0 ? parsed : parsed.transpose(semitones);
  return new ChordsOverWordsFormatter().format(song).trimEnd();
}

/**
 * Build a chords-over-words sheet from structured sections when no raw paste exists.
 * Chords sit on their own line; lyrics below — not syllable-aligned.
 */
export function synthesizeSheetFromSong(song: Song, semitones: number): string {
  const blocks: string[] = [];
  for (const s of song.sections) {
    const header = `[${s.name}]`;
    const chords = s.chords
      .map((c) => transposeChord(c, semitones))
      .filter((c) => c && c !== "-" && c !== "%")
      .join("  ");
    const lyrics = (s.lyrics ?? "").trim();
    const notes = s.notes?.trim() ? `(Notes: ${s.notes.trim()})` : "";
    const parts = [header];
    if (chords) parts.push(chords);
    if (notes) parts.push(notes);
    if (lyrics) parts.push(lyrics);
    blocks.push(parts.join("\n"));
  }
  return blocks.join("\n\n");
}

export function resolveLyricSheetText(
  song: Song,
  semitones: number,
): { text: string; fromSource: boolean } {
  if (song.sheetSource?.trim()) {
    const formatted = formatLyricSheet(song.sheetSource, semitones);
    if (formatted) return { text: formatted, fromSource: true };
  }
  return {
    text: synthesizeSheetFromSong(song, semitones),
    fromSource: false,
  };
}

/** Heuristic: line is mostly chord tokens (for bold styling). */
export function isChordLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("[") || trimmed.startsWith("(")) return false;
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  const chordish = tokens.filter((t) => CHORD_TOKEN.test(t) || t === "%" || t === "-" || t === "N.C." || t === "NC");
  return chordish.length / tokens.length >= 0.6;
}

export function isSectionHeader(line: string): boolean {
  return /^\[[^\]]+\]\s*$/.test(line.trim());
}
