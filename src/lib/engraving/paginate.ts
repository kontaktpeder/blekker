import type { NormalizedScore } from "./model";
import type { System } from "./layout";
import { layoutScore, wrapLyricToWidth } from "./layout";
import { UNIT } from "./renderer/typography";

/** All units in engraving units (0.1mm). A4 = 2100 × 2970. */
export const PAGE = {
  width: 2100,
  height: 2970,
  marginX: 120,
  marginTop: 100,
  marginBottom: 120,
  headerHeight: 200,
  sectionLabelWidth: 180,
  systemGap: 64,
  systemHeightNoLyrics: 220,
  maxLyricLinesForHeight: 2,
  /** Target page count for band charts. */
  maxPages: 2,
  /** Last page with this many systems or fewer is treated as an orphan — rebalance. */
  orphanSystemThreshold: 3,
} as const;

export interface Page {
  index: number;
  systems: PositionedSystem[];
  showHeader: boolean;
}

export interface PositionedSystem {
  system: System;
  x: number;
  y: number;
  height: number;
}

export interface DensityPreset {
  id: string;
  systemGap: number;
  heightScale: number;
  lyricGapScale: number;
  maxMeasuresPerSystem: number;
  headerHeight: number;
  marginTop: number;
}

/**
 * Spacious → only mildly compact. Avoid “squeeze” for normal charts —
 * prefer two readable pages over cramming onto one.
 */
export const DENSITY_PRESETS: DensityPreset[] = [
  {
    id: "comfortable",
    systemGap: 68,
    heightScale: 1,
    lyricGapScale: 1,
    maxMeasuresPerSystem: 4,
    headerHeight: 210,
    marginTop: 110,
  },
  {
    id: "roomy",
    systemGap: 56,
    heightScale: 0.98,
    lyricGapScale: 0.96,
    maxMeasuresPerSystem: 4,
    headerHeight: 200,
    marginTop: 100,
  },
  {
    id: "compact",
    systemGap: 44,
    heightScale: 0.94,
    lyricGapScale: 0.9,
    maxMeasuresPerSystem: 5,
    headerHeight: 185,
    marginTop: 90,
  },
  {
    id: "tight",
    systemGap: 34,
    heightScale: 0.9,
    lyricGapScale: 0.86,
    maxMeasuresPerSystem: 5,
    headerHeight: 175,
    marginTop: 84,
  },
];

/** Estimate wrapped lyric lines for height — matches SVG LyricLine wrapping. */
export function countLyricLines(lyrics: string | undefined, contentWidth: number): number {
  if (!lyrics?.trim()) return 0;
  const fontSize = UNIT.fontLyric;
  const wrapped = wrapLyricToWidth(
    lyrics,
    contentWidth,
    fontSize,
    UNIT.lyricCharWidth,
    UNIT.maxLyricWrapLines,
  );
  return Math.min(wrapped.length, PAGE.maxLyricLinesForHeight);
}

export function systemBlockHeight(
  sys: System,
  density: DensityPreset = DENSITY_PRESETS[0],
): number {
  const lyricLines = countLyricLines(sys.sectionLyrics, sys.contentWidth);
  const notesExtra = sys.sectionNotes?.trim() ? UNIT.notesRow + 22 : 0;
  const lyricGap = UNIT.lyricGap * density.lyricGapScale;
  const lineH = UNIT.fontLyric * 1.2 * density.lyricGapScale;
  const lyricH = lyricLines > 0 ? lyricGap + lyricLines * lineH : 0;
  const base = PAGE.systemHeightNoLyrics + notesExtra + lyricH;
  return Math.round(base * density.heightScale);
}

function pageContentTop(hasHeader: boolean, density: DensityPreset): number {
  return density.marginTop + (hasHeader ? density.headerHeight : 40);
}

function pageCapacity(hasHeader: boolean, density: DensityPreset): number {
  return PAGE.height - PAGE.marginBottom - pageContentTop(hasHeader, density);
}

/** Stack height for a run of systems (blocks + gaps between them). */
function stackHeight(systems: System[], density: DensityPreset): number {
  if (systems.length === 0) return 0;
  const blocks = systems.reduce((a, s) => a + systemBlockHeight(s, density), 0);
  return blocks + density.systemGap * (systems.length - 1);
}

function packSystemsVertically(
  systems: PositionedSystem[],
  hasHeader: boolean,
  density: DensityPreset,
): PositionedSystem[] {
  if (systems.length === 0) return systems;
  const top = pageContentTop(hasHeader, density);
  const bottom = PAGE.height - PAGE.marginBottom;
  const totalH = systems.reduce((a, s) => a + s.height, 0);
  const gaps = systems.length - 1;
  const available = bottom - top - totalH;

  let useGap = density.systemGap;
  if (gaps > 0) {
    if (available < 12 * gaps) {
      // Keep systems on-page — never let packing overflow the bottom margin.
      useGap = Math.max(10, Math.floor(Math.max(available, 10 * gaps) / gaps));
    } else if (available > density.systemGap * gaps * 1.25) {
      // Short page: open gaps slightly, leave a little air at the bottom.
      useGap = Math.min(Math.round(density.systemGap * 1.2), Math.floor(available / gaps));
    } else {
      useGap = Math.min(density.systemGap, Math.max(16, Math.floor(available / gaps)));
    }
  }

  let y = top;
  return systems.map((s) => {
    const next = { ...s, y };
    y += s.height + useGap;
    return next;
  });
}

function buildPages(groups: System[][], density: DensityPreset): Page[] {
  return groups.map((group, pageIdx) => {
    const positioned: PositionedSystem[] = group.map((sys) => ({
      system: sys,
      x: PAGE.marginX,
      y: 0,
      height: systemBlockHeight(sys, density),
    }));
    const packed = packSystemsVertically(positioned, pageIdx === 0, density);
    return { index: pageIdx, systems: packed, showHeader: pageIdx === 0 };
  });
}

function pageFits(systems: System[], hasHeader: boolean, density: DensityPreset): boolean {
  return stackHeight(systems, density) <= pageCapacity(hasHeader, density) + 1;
}

function isSparseLastPage(pages: Page[]): boolean {
  if (pages.length < 2) return false;
  return pages[pages.length - 1].systems.length <= PAGE.orphanSystemThreshold;
}

/**
 * Natural top-to-bottom flow; breaks when the next system would clip.
 */
export function paginateWithDensity(
  _score: NormalizedScore,
  systems: System[],
  density: DensityPreset,
): Page[] {
  const pages: Page[] = [];
  let pageIdx = 0;
  let y = pageContentTop(true, density);
  let current: PositionedSystem[] = [];

  const pushPage = () => {
    const packed = packSystemsVertically(current, pageIdx === 0, density);
    pages.push({ index: pageIdx, systems: packed, showHeader: pageIdx === 0 });
    pageIdx++;
    current = [];
    y = pageContentTop(false, density);
  };

  for (const sys of systems) {
    const h = systemBlockHeight(sys, density);
    if (y + h > PAGE.height - PAGE.marginBottom && current.length > 0) {
      pushPage();
    }
    current.push({ system: sys, x: PAGE.marginX, y, height: h });
    y += h + density.systemGap;
  }
  if (current.length > 0) pushPage();
  return pages;
}

/**
 * Split systems across exactly `pageCount` pages, balancing height and
 * avoiding a nearly-empty last page.
 */
export function splitAcrossPages(
  systems: System[],
  density: DensityPreset,
  pageCount: number,
): System[][] | null {
  if (systems.length === 0) return [];
  if (pageCount <= 1) return [systems];
  if (systems.length < pageCount) return null;

  if (pageCount === 2) {
    let best: { split: number; score: number } | null = null;
    for (let split = 1; split < systems.length; split++) {
      const first = systems.slice(0, split);
      const second = systems.slice(split);
      if (!pageFits(first, true, density)) continue;
      if (!pageFits(second, false, density)) continue;

      const c1 = pageCapacity(true, density);
      const c2 = pageCapacity(false, density);
      const f1 = stackHeight(first, density) / c1;
      const f2 = stackHeight(second, density) / c2;
      // Prefer even fill; heavily penalize orphan last pages.
      let score = Math.abs(f1 - f2);
      if (second.length <= PAGE.orphanSystemThreshold) score += 2;
      if (second.length === 1) score += 3;
      // Mild preference for not overstuffing page 1.
      if (f1 > 0.96) score += 0.4;

      if (!best || score < best.score) best = { split, score };
    }
    if (!best) return null;
    return [systems.slice(0, best.split), systems.slice(best.split)];
  }

  // Generic even split by count, then validate.
  const groups: System[][] = Array.from({ length: pageCount }, () => []);
  systems.forEach((s, i) => {
    groups[Math.min(pageCount - 1, Math.floor((i * pageCount) / systems.length))].push(s);
  });
  for (let i = 0; i < pageCount; i++) {
    if (groups[i].length === 0) return null;
    if (!pageFits(groups[i], i === 0, density)) return null;
  }
  return groups;
}

export interface FitResult {
  pages: Page[];
  density: DensityPreset;
  systems: System[];
}

/**
 * Layout + paginate for band use: prefer two spacious pages.
 * Never leave a single orphan system on page 2 while crushing page 1.
 */
export function fitLeadSheetPages(
  score: NormalizedScore,
  systemContentWidth: number,
): FitResult {
  let fallback: FitResult | null = null;

  for (const density of DENSITY_PRESETS) {
    const systems = layoutScore(score, {
      systemContentWidth,
      maxMeasuresPerSystem: density.maxMeasuresPerSystem,
    });

    // Short charts may stay on one page if they fit with room to spare.
    if (
      systems.length > 0 &&
      systems.length <= 7 &&
      pageFits(systems, true, density)
    ) {
      const pages = buildPages([systems], density);
      return { pages, density, systems };
    }

    // Preferred path: exactly two balanced pages.
    const split = splitAcrossPages(systems, density, PAGE.maxPages);
    if (split) {
      const pages = buildPages(split, density);
      if (!isSparseLastPage(pages) || systems.length <= PAGE.orphanSystemThreshold + 1) {
        return { pages, density, systems };
      }
      // Still sparse but both pages fit — accept first spacious density.
      return { pages, density, systems };
    }

    // Natural flow as fallback candidate (may be 3+ pages).
    const natural = paginateWithDensity(score, systems, density);
    if (!fallback || natural.length < fallback.pages.length) {
      fallback = { pages: natural, density, systems };
    }
    if (natural.length <= PAGE.maxPages && !isSparseLastPage(natural)) {
      return { pages: natural, density, systems };
    }
  }

  // Last resort: densest preset, force the best 2-page split even if slightly tight.
  const density = DENSITY_PRESETS[DENSITY_PRESETS.length - 1];
  const systems = layoutScore(score, {
    systemContentWidth,
    maxMeasuresPerSystem: density.maxMeasuresPerSystem,
  });
  const forced = splitAcrossPages(systems, density, PAGE.maxPages);
  if (forced) {
    return { pages: buildPages(forced, density), density, systems };
  }

  return fallback ?? {
    pages: paginateWithDensity(score, systems, density),
    density,
    systems,
  };
}

/**
 * One tall continuous page for Live scroll — no A4 breaks.
 * Uses a roomy density so systems stay stage-readable.
 */
export function layoutContinuousLeadSheet(
  score: NormalizedScore,
  systemContentWidth: number,
  density: DensityPreset = DENSITY_PRESETS[0],
): FitResult & { pageHeight: number } {
  const systems = layoutScore(score, {
    systemContentWidth,
    maxMeasuresPerSystem: density.maxMeasuresPerSystem,
  });

  const top = pageContentTop(true, density);
  let y = top;
  const positioned: PositionedSystem[] = systems.map((sys) => {
    const h = systemBlockHeight(sys, density);
    const ps: PositionedSystem = { system: sys, x: PAGE.marginX, y, height: h };
    y += h + density.systemGap;
    return ps;
  });

  const contentBottom =
    systems.length > 0 ? y - density.systemGap : top;
  const pageHeight = Math.max(
    Math.round(contentBottom + PAGE.marginBottom),
    pageContentTop(true, density) + 400,
  );

  return {
    pages: [{ index: 0, systems: positioned, showHeader: true }],
    density,
    systems,
    pageHeight,
  };
}

/** @deprecated Prefer fitLeadSheetPages — kept for simple callers. */
export function paginate(score: NormalizedScore, systems: System[]): Page[] {
  return paginateWithDensity(score, systems, DENSITY_PRESETS[0]);
}
