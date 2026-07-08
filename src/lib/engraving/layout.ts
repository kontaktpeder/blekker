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
  /** Only rendered on isSectionStart systems. */
  sectionLyrics?: string;
  sectionNotes?: string;
  measures: LaidMeasure[];
  /** Absolute width of the system's musical content. */
  contentWidth: number;
}

const MIN_MEASURE_WIDTH = 180;   // ~18mm — sensible minimum
const CHORD_SLOT = 90;           // ~9mm per additional chord in the bar
const REST_WIDTH = 150;
const SIMILE_WIDTH = 150;

/** Intrinsic (unjustified) width for a measure based on musical density. */
function intrinsicWidth(m: Measure): number {
  if (m.slash === "rest") return REST_WIDTH;
  if (m.slash === "simile") return SIMILE_WIDTH;
  const chordCount = Math.max(1, m.chords.length);
  return MIN_MEASURE_WIDTH + (chordCount - 1) * CHORD_SLOT;
}

interface LayoutOpts {
  /** Available width for measures INSIDE a system (after left indent). */
  systemContentWidth: number;
  /** Max measures per system regardless of width. */
  maxMeasuresPerSystem?: number;
}

function buildSystemFromMeasures(
  section: EngravedSection,
  measures: Measure[],
  isSectionStart: boolean,
  contentWidth: number,
): System {
  // Justify: sum intrinsic, then distribute leftover proportionally.
  const intrinsics = measures.map(intrinsicWidth);
  const total = intrinsics.reduce((a, b) => a + b, 0);
  const scale = total > 0 ? contentWidth / total : 1;
  const widths = intrinsics.map((w) => w * scale);

  let x = 0;
  const laid: LaidMeasure[] = measures.map((m, i) => {
    const w = widths[i];
    const beats = Math.max(1, m.beats);
    // First beat inset slightly, last beat inset slightly (avoid touching barlines).
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
    sectionLyrics: isSectionStart ? section.lyrics : undefined,
    sectionNotes: isSectionStart ? section.notes : undefined,
    measures: laid,
    contentWidth,
  };
}

export function layoutScore(score: NormalizedScore, opts: LayoutOpts): System[] {
  const systems: System[] = [];
  const maxPer = opts.maxMeasuresPerSystem ?? 6;
  const maxWidth = opts.systemContentWidth;

  for (const section of score.sections) {
    let bucket: Measure[] = [];
    let bucketIntrinsic = 0;
    let first = true;

    const flush = () => {
      if (bucket.length === 0) return;
      systems.push(buildSystemFromMeasures(section, bucket, first, maxWidth));
      first = false;
      bucket = [];
      bucketIntrinsic = 0;
    };

    for (const m of section.measures) {
      const w = intrinsicWidth(m);
      const overflow = bucketIntrinsic + w > maxWidth * 1.05 && bucket.length > 0;
      const tooMany = bucket.length >= maxPer;
      if (overflow || tooMany) flush();
      bucket.push(m);
      bucketIntrinsic += w;
    }
    flush();
  }

  return systems;
}
