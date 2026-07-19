import type { NormalizedScore } from "./model";
import type { System } from "./layout";
import { UNIT } from "./renderer/typography";

/** All units in engraving units (0.1mm). A4 = 2100 × 2970. */
export const PAGE = {
  width: 2100,
  height: 2970,
  marginX: 130,
  marginTop: 120,
  marginBottom: 110,
  headerHeight: 240, // title block, first page only
  sectionLabelWidth: 200,
  systemGap: 72,
  /** Base height: marker + chord + staff (+ a little breathing room). */
  systemHeightNoLyrics: 200,
  /** Max lyric lines that affect reserved height (extra lines still draw). */
  maxLyricLinesForHeight: 5,
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

/** Rough lyric line count — mirrors LeadSheetSvg wrap heuristic. */
export function countLyricLines(lyrics: string | undefined, contentWidth: number): number {
  if (!lyrics?.trim()) return 0;
  const maxChars = Math.max(20, Math.floor(contentWidth / (UNIT.fontLyric * 0.55)));
  let total = 0;
  for (const raw of lyrics.split(/\n/)) {
    const words = raw.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      total += 1;
      continue;
    }
    let cur = "";
    let lines = 0;
    for (const wd of words) {
      if ((cur + " " + wd).trim().length > maxChars) {
        if (cur) lines++;
        cur = wd;
      } else {
        cur = cur ? `${cur} ${wd}` : wd;
      }
    }
    if (cur) lines++;
    total += Math.max(1, lines);
  }
  return total;
}

export function systemBlockHeight(sys: System): number {
  const lyricLines = Math.min(
    countLyricLines(sys.sectionLyrics, sys.contentWidth),
    PAGE.maxLyricLinesForHeight,
  );
  const notesExtra = sys.sectionNotes?.trim() ? 22 : 0;
  const lyricH =
    lyricLines > 0 ? UNIT.lyricGap + lyricLines * (UNIT.fontLyric * 1.25) : 0;
  return PAGE.systemHeightNoLyrics + notesExtra + lyricH;
}

export function paginate(_score: NormalizedScore, systems: System[]): Page[] {
  const pages: Page[] = [];
  let pageIdx = 0;
  let y = PAGE.marginTop + PAGE.headerHeight;
  let current: PositionedSystem[] = [];

  const pushPage = () => {
    // Pack leftover vertical space on pages with room (esp. last / sparse pages).
    const packed = packSystemsVertically(current, pageIdx === 0);
    pages.push({ index: pageIdx, systems: packed, showHeader: pageIdx === 0 });
    pageIdx++;
    current = [];
    y = PAGE.marginTop + 40;
  };

  for (const sys of systems) {
    const h = systemBlockHeight(sys);
    if (y + h > PAGE.height - PAGE.marginBottom && current.length > 0) {
      pushPage();
    }
    current.push({ system: sys, x: PAGE.marginX, y, height: h });
    y += h + PAGE.systemGap;
  }
  if (current.length > 0) pushPage();

  return pages;
}

/** If a page has unused bottom space, nudge systems downward a bit less / keep top-packed
 *  but shrink gaps so the block reads denser when only a few systems remain. */
function packSystemsVertically(
  systems: PositionedSystem[],
  hasHeader: boolean,
): PositionedSystem[] {
  if (systems.length === 0) return systems;
  const top = PAGE.marginTop + (hasHeader ? PAGE.headerHeight : 40);
  const bottom = PAGE.height - PAGE.marginBottom;
  const totalH = systems.reduce((a, s) => a + s.height, 0);
  const gaps = systems.length - 1;
  const available = bottom - top - totalH;
  if (gaps <= 0 || available <= 0) {
    // Re-stack from top with default gap (or flush).
    let y = top;
    return systems.map((s) => {
      const next = { ...s, y };
      y += s.height + PAGE.systemGap;
      return next;
    });
  }
  // Prefer slightly tighter than default when there's lots of leftover whitespace.
  const idealGap = Math.min(PAGE.systemGap, Math.max(36, available / Math.max(gaps, 1)));
  // If leftover is huge (few systems on last page), don't stretch — keep compact at top.
  const useGap =
    available > PAGE.systemGap * gaps * 1.5
      ? Math.max(40, PAGE.systemGap * 0.75)
      : idealGap;

  let y = top;
  return systems.map((s) => {
    const next = { ...s, y };
    y += s.height + useGap;
    return next;
  });
}
