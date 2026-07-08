import type { NormalizedScore } from "./model";
import type { System } from "./layout";

/** All units in engraving units (0.1mm). A4 = 2100 × 2970. */
export const PAGE = {
  width: 2100,
  height: 2970,
  marginX: 130,
  marginTop: 140,
  marginBottom: 130,
  headerHeight: 260,   // title block, first page only
  sectionLabelWidth: 200, // reserved on the LEFT of a section-start system
  systemGap: 130,      // vertical gap between systems
  systemHeight: 320,   // staff + chord row + lyric row
  systemHeightNoLyrics: 220,
} as const;

export interface Page {
  index: number;
  systems: PositionedSystem[];
  showHeader: boolean;
}

export interface PositionedSystem {
  system: System;
  /** Top-left of the system's staff area. */
  x: number;
  y: number;
  height: number;
}

export function paginate(_score: NormalizedScore, systems: System[]): Page[] {
  const pages: Page[] = [];
  let pageIdx = 0;
  let y = PAGE.marginTop + PAGE.headerHeight;
  let current: PositionedSystem[] = [];

  const pushPage = () => {
    pages.push({ index: pageIdx, systems: current, showHeader: pageIdx === 0 });
    pageIdx++;
    current = [];
    y = PAGE.marginTop + (pageIdx === 0 ? PAGE.headerHeight : 40);
  };

  for (const sys of systems) {
    const hasLyrics = !!sys.sectionLyrics;
    const h = hasLyrics ? PAGE.systemHeight : PAGE.systemHeightNoLyrics;
    if (y + h > PAGE.height - PAGE.marginBottom && current.length > 0) {
      pushPage();
    }
    current.push({ system: sys, x: PAGE.marginX, y, height: h });
    y += h + PAGE.systemGap;
  }
  if (current.length > 0) pushPage();

  return pages;
}
