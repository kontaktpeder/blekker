import type { NormalizedScore } from "./model";
import type { System } from "./layout";
import { layoutScore } from "./layout";
import { UNIT } from "./renderer/typography";

/** All units in engraving units (0.1mm). A4 = 2100 × 2970. */
export const PAGE = {
  width: 2100,
  height: 2970,
  marginX: 120,
  marginTop: 100,
  marginBottom: 90,
  headerHeight: 200,
  sectionLabelWidth: 180,
  systemGap: 52,
  systemHeightNoLyrics: 195,
  maxLyricLinesForHeight: 5,
  /** Soft cap — orphan systems on page 3+ get compressed away. */
  maxPages: 2,
  /** If the last page has this many systems or fewer, force a tighter density. */
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

/** Comfortable → squeeze. Used to keep charts on ≤ 2 pages. */
export const DENSITY_PRESETS: DensityPreset[] = [
  {
    id: "comfortable",
    systemGap: 52,
    heightScale: 1,
    lyricGapScale: 1,
    maxMeasuresPerSystem: 4,
    headerHeight: 200,
    marginTop: 100,
  },
  {
    id: "compact",
    systemGap: 38,
    heightScale: 0.94,
    lyricGapScale: 0.9,
    maxMeasuresPerSystem: 5,
    headerHeight: 180,
    marginTop: 90,
  },
  {
    id: "tight",
    systemGap: 28,
    heightScale: 0.88,
    lyricGapScale: 0.82,
    maxMeasuresPerSystem: 6,
    headerHeight: 170,
    marginTop: 80,
  },
  {
    id: "squeeze",
    systemGap: 20,
    heightScale: 0.82,
    lyricGapScale: 0.75,
    maxMeasuresPerSystem: 8,
    headerHeight: 160,
    marginTop: 72,
  },
];

/** Rough lyric line count — one clean line per system after distribution. */
export function countLyricLines(lyrics: string | undefined, _contentWidth: number): number {
  if (!lyrics?.trim()) return 0;
  // Distributed lyrics are a single line (possibly joined with ·).
  return 1;
}

export function systemBlockHeight(
  sys: System,
  density: DensityPreset = DENSITY_PRESETS[0],
): number {
  const lyricLines = Math.min(
    countLyricLines(sys.sectionLyrics, sys.contentWidth),
    PAGE.maxLyricLinesForHeight,
  );
  const notesExtra = sys.sectionNotes?.trim() ? UNIT.notesRow + 8 : 0;
  const lyricGap = UNIT.lyricGap * density.lyricGapScale;
  const lyricH =
    lyricLines > 0 ? lyricGap + lyricLines * (UNIT.fontLyric * 1.2 * density.lyricGapScale) : 0;
  const base = PAGE.systemHeightNoLyrics + notesExtra + lyricH;
  return Math.round(base * density.heightScale);
}

function pageContentTop(hasHeader: boolean, density: DensityPreset): number {
  return density.marginTop + (hasHeader ? density.headerHeight : 36);
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
  if (gaps > 0 && available > 0) {
    if (available > density.systemGap * gaps * 1.4) {
      // Sparse page — keep compact at top, don't stretch.
      useGap = Math.max(16, Math.round(density.systemGap * 0.85));
    } else {
      useGap = Math.min(density.systemGap, Math.max(14, available / gaps));
    }
  }

  let y = top;
  return systems.map((s) => {
    const next = { ...s, y };
    y += s.height + useGap;
    return next;
  });
}

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

function isOrphanLastPage(pages: Page[]): boolean {
  if (pages.length <= PAGE.maxPages) return false;
  const last = pages[pages.length - 1];
  return last.systems.length <= PAGE.orphanSystemThreshold;
}

function needsTighterFit(pages: Page[]): boolean {
  if (pages.length > PAGE.maxPages) return true;
  return false;
}

export interface FitResult {
  pages: Page[];
  density: DensityPreset;
  systems: System[];
}

/**
 * Layout + paginate, stepping through denser presets until the chart fits on
 * ≤ 2 pages. Especially collapses the case where 1–3 leftover systems would
 * otherwise spill onto a nearly-blank third page.
 */
export function fitLeadSheetPages(
  score: NormalizedScore,
  systemContentWidth: number,
): FitResult {
  let best: FitResult | null = null;

  for (const density of DENSITY_PRESETS) {
    const systems = layoutScore(score, {
      systemContentWidth,
      maxMeasuresPerSystem: density.maxMeasuresPerSystem,
    });
    const pages = paginateWithDensity(score, systems, density);
    const result = { pages, density, systems };

    if (!best || pages.length < best.pages.length) best = result;
    else if (
      best &&
      pages.length === best.pages.length &&
      pages[pages.length - 1].systems.length >
        best.pages[best.pages.length - 1].systems.length
    ) {
      // Prefer more content on the last page (less sparse) at same page count.
      best = result;
    }

    if (!needsTighterFit(pages) && !isOrphanLastPage(pages)) {
      return result;
    }
    // Continue if we still have >2 pages (orphan rule covered by needsTighterFit).
  }

  return best!;
}

/** @deprecated Prefer fitLeadSheetPages — kept for simple callers. */
export function paginate(score: NormalizedScore, systems: System[]): Page[] {
  return paginateWithDensity(score, systems, DENSITY_PRESETS[0]);
}
