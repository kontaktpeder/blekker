import type { NormalizedScore, Measure, EngravedSection } from "./model";

/**
 * Layout engine — turns normalized sections into justified systems.
 * Units are engraving units (1u = 0.1mm; SVG viewBox uses the same).
 *
 * Widths are INTRINSIC first, then justified to fill the content area.
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
const CHORD_SLOT = 90;
const REST_WIDTH = 150;
const SIMILE_WIDTH = 150;

function intrinsicWidth(m: Measure): number {
  if (m.slash === "rest") return REST_WIDTH;
  if (m.slash === "simile") return SIMILE_WIDTH;
  const chordCount = Math.max(1, m.chords.length);
  return MIN_MEASURE_WIDTH + (chordCount - 1) * CHORD_SLOT;
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
    const inset = 18;
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

/** Split lyrics into non-empty lines and assign one clean line per system. */
export function distributeLyricLines(
  lyrics: string | undefined,
  numSystems: number,
): (string | undefined)[] {
  const out: (string | undefined)[] = Array.from({ length: numSystems }, () => undefined);
  if (numSystems <= 0) return out;
  const lines = (lyrics ?? "")
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return out;

  if (lines.length <= numSystems) {
    lines.forEach((line, i) => {
      out[i] = line;
    });
    return out;
  }

  // More lyric lines than systems: pack evenly into one flowing line per system.
  const base = Math.floor(lines.length / numSystems);
  const extra = lines.length % numSystems;
  let idx = 0;
  for (let s = 0; s < numSystems; s++) {
    const take = base + (s < extra ? 1 : 0);
    const chunk = lines.slice(idx, idx + take);
    idx += take;
    out[s] = chunk.join(" · ");
  }
  return out;
}

export function layoutScore(score: NormalizedScore, opts: LayoutOpts): System[] {
  const systems: System[] = [];
  const maxPer = opts.maxMeasuresPerSystem ?? 6;
  const maxWidth = opts.systemContentWidth;

  for (const section of score.sections) {
    const total = section.measures.length;
    if (total === 0) continue;
    const numSystems = Math.max(1, Math.ceil(total / maxPer));
    const base = Math.floor(total / numSystems);
    const extra = total % numSystems;
    const lyricPerSystem = distributeLyricLines(section.lyrics, numSystems);

    let idx = 0;
    for (let s = 0; s < numSystems; s++) {
      const size = base + (s < extra ? 1 : 0);
      const slice = section.measures.slice(idx, idx + size);
      idx += size;
      systems.push(
        buildSystemFromMeasures(
          section,
          slice,
          s === 0,
          maxWidth,
          lyricPerSystem[s],
        ),
      );
    }
  }

  return systems;
}
