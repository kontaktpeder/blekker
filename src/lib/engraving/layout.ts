import type { NormalizedScore, Measure, EngravedSection } from "./model";
import { UNIT } from "./renderer/typography";

/**
 * Layout engine — turns normalized sections into justified systems.
 * Units are engraving units (1u = 0.1mm; SVG viewBox uses the same).
 *
 * Widths are INTRINSIC first (must fit chord glyphs without overlap),
 * then justified to fill the content area.
 */

export interface LaidMeasure {
  measure: Measure;
  x: number;
  width: number;
  /** X coordinate of each beat inside the measure (for chord placement). */
  beatX: number[];
}

export interface System {
  sectionId: string;
  /** True when this system is the first of its section (draws label + rehearsal box). */
  isSectionStart: boolean;
  sectionLabel: string;
  /**
   * One clean lyric line for this system (distributed across the section’s systems).
   * Not a multi-line bulk dump.
   */
  sectionLyrics?: string;
  sectionNotes?: string;
  measures: LaidMeasure[];
  /** Absolute width of the system's musical content. */
  contentWidth: number;
}

const MIN_MEASURE_WIDTH = 180;
const REST_WIDTH = 150;
const SIMILE_WIDTH = 150;
const CHORD_GAP = 12;
const MEASURE_INSET = 16;

/** Approximate advance width of a bold serif chord glyph string. */
export function estimateChordSymbolWidth(symbol: string, fontSize: number): number {
  let w = 0;
  for (const ch of symbol) {
    if (ch === "#" || ch === "b" || ch === "/" || ch === "♯" || ch === "♭") w += fontSize * 0.48;
    else if (ch === "i" || ch === "l" || ch === "1") w += fontSize * 0.38;
    else if (ch === "m" || ch === "w") w += fontSize * 0.72;
    else w += fontSize * 0.62;
  }
  return Math.max(fontSize * 1.15, w);
}

function chordFontForCount(n: number): number {
  if (n >= 3) return UNIT.fontChord * 0.82;
  if (n === 2) return UNIT.fontChord * 0.92;
  return UNIT.fontChord;
}

/** Minimum measure width so every chord glyph can sit without overlapping. */
export function intrinsicWidth(m: Measure): number {
  if (m.slash === "rest") return REST_WIDTH;
  if (m.slash === "simile") return SIMILE_WIDTH;
  const n = Math.max(1, m.chords.length);
  const fontSize = chordFontForCount(n);
  if (m.chords.length === 0) return MIN_MEASURE_WIDTH;
  const span = m.chords.reduce(
    (sum, c, i) =>
      sum + estimateChordSymbolWidth(c.symbol, fontSize) + (i > 0 ? CHORD_GAP : 0),
    0,
  );
  return Math.max(MIN_MEASURE_WIDTH, MEASURE_INSET * 2 + span);
}

/**
 * Place chord left-edges so glyphs never overlap.
 * Prefers beat-aligned positions, then pushes right / packs left as needed.
 * Global rule: no chord text may cover another.
 */
export function resolveNonOverlappingChordXs(
  preferredXs: number[],
  widths: number[],
  minX: number,
  maxRight: number,
  gap: number = CHORD_GAP,
): number[] {
  const n = preferredXs.length;
  if (n === 0) return [];
  const xs = preferredXs.map((x) => Math.max(minX, x));

  for (let i = 1; i < n; i++) {
    const minAllowed = xs[i - 1] + widths[i - 1] + gap;
    if (xs[i] < minAllowed) xs[i] = minAllowed;
  }

  let lastRight = xs[n - 1] + widths[n - 1];
  if (lastRight > maxRight) {
    const overflow = lastRight - maxRight;
    const roomLeft = Math.max(0, xs[0] - minX);
    const shift = Math.min(overflow, roomLeft);
    for (let i = 0; i < n; i++) xs[i] -= shift;
    lastRight = xs[n - 1] + widths[n - 1];
  }

  if (lastRight > maxRight) {
    // Tight pack from the left — still no overlaps; caller may shrink font.
    xs[0] = minX;
    for (let i = 1; i < n; i++) {
      xs[i] = xs[i - 1] + widths[i - 1] + gap;
    }
  }

  return xs;
}

/** True if packed chords fit inside [minX, maxRight]. */
export function chordsFitInSpan(
  widths: number[],
  minX: number,
  maxRight: number,
  gap: number = CHORD_GAP,
): boolean {
  if (widths.length === 0) return true;
  const need = widths.reduce((a, w, i) => a + w + (i > 0 ? gap : 0), 0);
  return minX + need <= maxRight + 0.5;
}

interface LayoutOpts {
  systemContentWidth: number;
  maxMeasuresPerSystem?: number;
}

function buildSystemFromMeasures(
  section: EngravedSection,
  measures: Measure[],
  isSectionStart: boolean,
  contentWidth: number,
  lyricLine?: string,
): System {
  const intrinsics = measures.map(intrinsicWidth);
  const total = intrinsics.reduce((a, b) => a + b, 0);
  const scale = total > 0 ? contentWidth / total : 1;
  const widths = intrinsics.map((w) => w * scale);

  let x = 0;
  const laid: LaidMeasure[] = measures.map((m, i) => {
    const w = widths[i];
    const beats = Math.max(1, m.beats);
    const inset = MEASURE_INSET;
    const usable = Math.max(0, w - inset * 2);
    const step = beats > 1 ? usable / (beats - 1) : 0;
    const beatX: number[] = [];
    for (let b = 0; b < beats; b++) beatX.push(x + inset + step * b);
    const lm: LaidMeasure = { measure: m, x, width: w, beatX };
    x += w;
    return lm;
  });

  return {
    sectionId: section.id,
    isSectionStart,
    sectionLabel: section.label,
    sectionLyrics: lyricLine,
    sectionNotes: isSectionStart ? section.notes : undefined,
    measures: laid,
    contentWidth,
  };
}

/** Split lyrics into phrases (newlines, middots, spaced dashes). */
export function splitLyricPhrases(lyrics: string | undefined): string[] {
  if (!lyrics?.trim()) return [];
  return lyrics
    .split(/\n+|(?:\s*[·•]\s*)|(?:\s+[-–—]\s+)/)
    .map((l) => l.trim())
    .filter(Boolean);
}

/**
 * Assign phrases across systems so long verses are not dumped under system 1
 * (which overflows the page edge). Global for every chart.
 */
export function distributeLyricLines(
  lyrics: string | undefined,
  numSystems: number,
): (string | undefined)[] {
  const out: (string | undefined)[] = Array.from({ length: numSystems }, () => undefined);
  if (numSystems <= 0) return out;
  const phrases = splitLyricPhrases(lyrics);
  if (phrases.length === 0) return out;

  if (phrases.length <= numSystems) {
    phrases.forEach((line, i) => {
      out[i] = line;
    });
    return out;
  }

  const base = Math.floor(phrases.length / numSystems);
  const extra = phrases.length % numSystems;
  let idx = 0;
  for (let s = 0; s < numSystems; s++) {
    const take = base + (s < extra ? 1 : 0);
    const chunk = phrases.slice(idx, idx + take);
    idx += take;
    out[s] = chunk.join(" · ");
  }
  return out;
}

/** Word-wrap a lyric string to a pixel width; used by SVG + height estimates. */
export function wrapLyricToWidth(
  text: string,
  maxWidth: number,
  fontSize: number,
  charWidthFactor: number,
  maxLines: number,
): string[] {
  const trimmed = text.trim();
  if (!trimmed || maxWidth <= 0 || maxLines <= 0) return trimmed ? [trimmed] : [];
  const maxChars = Math.max(12, Math.floor(maxWidth / (fontSize * charWidthFactor)));
  const words = trimmed.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > maxChars && cur) {
      lines.push(cur);
      cur = w;
      if (lines.length >= maxLines - 1) {
        const rest = [cur, ...words.slice(i + 1)].join(" ");
        lines.push(rest.length > maxChars ? `${rest.slice(0, Math.max(1, maxChars - 1))}…` : rest);
        return lines.slice(0, maxLines);
      }
    } else if (next.length > maxChars && !cur) {
      lines.push(`${w.slice(0, Math.max(1, maxChars - 1))}…`);
      cur = "";
      if (lines.length >= maxLines) return lines;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, maxLines);
}

/**
 * Pack measures into systems: respect max-per-system, but break early when
 * chord-intrinsic widths would crush glyphs into each other.
 */
export function layoutScore(score: NormalizedScore, opts: LayoutOpts): System[] {
  const systems: System[] = [];
  const maxPer = opts.maxMeasuresPerSystem ?? 6;
  const maxWidth = opts.systemContentWidth;

  for (const section of score.sections) {
    if (section.measures.length === 0) continue;

    const groups: Measure[][] = [];
    let current: Measure[] = [];
    let currentW = 0;

    for (const m of section.measures) {
      const w = intrinsicWidth(m);
      const nextW = current.length === 0 ? w : currentW + w;
      if (
        current.length > 0 &&
        (current.length >= maxPer || nextW > maxWidth * 1.05)
      ) {
        groups.push(current);
        current = [];
        currentW = 0;
      }
      current.push(m);
      currentW += intrinsicWidth(m);
    }
    if (current.length > 0) groups.push(current);

    const lyricPerSystem = distributeLyricLines(section.lyrics, groups.length);
    groups.forEach((slice, s) => {
      systems.push(
        buildSystemFromMeasures(
          section,
          slice,
          s === 0,
          maxWidth,
          lyricPerSystem[s],
        ),
      );
    });
  }

  return systems;
}
