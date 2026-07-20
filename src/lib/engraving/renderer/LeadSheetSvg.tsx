import type { NormalizedScore } from "../model";
import type { PositionedSystem, Page, DensityPreset } from "../paginate";
import { PAGE, DENSITY_PRESETS } from "../paginate";
import type { LaidMeasure, System } from "../layout";
import {
  wrapLyricToWidth,
  estimateChordSymbolWidth,
  resolveNonOverlappingChordXs,
  chordsFitInSpan,
} from "../layout";
import { UNIT, STAGE_UNIT, SERIF, type EngravingUnits } from "./typography";
import { KEY_ACCIDENTALS } from "./glyphs";
import { localizeBandNotes } from "@/lib/band-notes-no";
import { CHART_THEMES, type ChartThemeId } from "./theme";
import { createContext, useContext } from "react";

interface Props {
  score: NormalizedScore;
  pages: Page[];
  showLyrics: boolean;
  density?: DensityPreset;
  /** paper = PDF; stage = dark Live. */
  theme?: ChartThemeId;
  /** Per-page viewBox height (engraving units). Defaults to A4. */
  pageHeights?: number[];
  /** Single continuous scroll surface (no page gaps). */
  continuous?: boolean;
  /**
   * Stage Live: section labels above the staff (not left column),
   * larger type, thicker strokes. Must match LiveLeadSheet content width.
   */
  stageLayout?: boolean;
}

type EngravingCtx = {
  units: EngravingUnits;
  /** Width reserved left of clef for section labels (0 on stage). */
  labelColumn: number;
  /** Place Intro/Vers/… above the system instead of in the left margin. */
  labelAbove: boolean;
};

const EngravingContext = createContext<EngravingCtx>({
  units: UNIT,
  labelColumn: 170,
  labelAbove: false,
});

function useEngraving() {
  return useContext(EngravingContext);
}

/* --- Musical prefix widths (must match LeadSheetChart / LiveLeadSheet) --- */
const PRINT_LABEL_W = 170;
const CLEF_W = 84;
const KEYSIG_STEP = 20;
const TIMESIG_W = 56;

function keySigWidth(key: string): number {
  const info = KEY_ACCIDENTALS[key];
  const count = info?.count ?? 0;
  return count * KEYSIG_STEP;
}

/* --- SVG helpers ---------------------------------------------------------- */
function StaffLines({ x, y, w }: { x: number; y: number; w: number }) {
  const { units: u } = useEngraving();
  const lines = [];
  for (let i = 0; i < 5; i++) {
    const ly = y + i * u.staffLine;
    lines.push(
      <line
        key={i}
        x1={x}
        x2={x + w}
        y1={ly}
        y2={ly}
        stroke="var(--chart-ink)"
        strokeWidth={u.strokeStaff}
      />,
    );
  }
  return <g>{lines}</g>;
}

function TrebleClef({ x, y }: { x: number; y: number }) {
  const { units: u } = useEngraving();
  // Y is the staff top. Clef sits centered on the G-line (2nd from bottom).
  const cy = y + u.staffLine * 3;
  return (
    <text
      x={x}
      y={cy + 18}
      fontFamily="'Bravura Text','Noto Music','Segoe UI Symbol','Apple Symbols',serif"
      fontSize={78}
      fill="var(--chart-ink)"
    >
      {"\u{1D11E}"}
    </text>
  );
}

function KeySignature({ x, y, keyName }: { x: number; y: number; keyName: string }) {
  const info = KEY_ACCIDENTALS[keyName];
  if (!info || info.count === 0) return null;
  // Staff line positions from top (y=0..48, step 6). Sharp/flat sequence positions:
  const SHARP_Y = [0, 18, -6, 12, 30, 6, 24]; // F# C# G# D# A# E# B#
  const FLAT_Y = [18, 6, 24, 12, 30, 18, 36]; // Bb Eb Ab Db Gb Cb Fb
  const positions = info.type === "sharp" ? SHARP_Y : FLAT_Y;
  const glyph = info.type === "sharp" ? "\u266F" : "\u266D";
  return (
    <g>
      {positions.slice(0, info.count).map((offset, i) => (
        <text
          key={i}
          x={x + i * KEYSIG_STEP}
          y={y + offset + 22}
          fontFamily={SERIF}
          fontSize={38}
          fill="var(--chart-ink)"
        >
          {glyph}
        </text>
      ))}
    </g>
  );
}

function TimeSignature({ x, y, ts }: { x: number; y: number; ts: string }) {
  const { units: u } = useEngraving();
  const [num, den] = ts.split("/");
  const cx = x + TIMESIG_W / 2;
  const fs = u.fontTimeSig;
  // Digits centered in upper / lower staff halves (staff height = 4×staffLine).
  // Baselines chosen so Georgia bold stays inside the five lines when rasterized.
  return (
    <g fontFamily={SERIF} fontWeight={700} fontSize={fs} fill="var(--chart-ink)" textAnchor="middle">
      <text x={cx} y={y + u.staffLine * 2 - 2}>
        {num}
      </text>
      <text x={cx} y={y + u.staffLine * 4 - 2}>
        {den ?? "4"}
      </text>
    </g>
  );
}

function wrapSectionLabel(label: string, maxWidth: number, fontSize: number): string[] {
  const maxChars = Math.max(8, Math.floor(maxWidth / (fontSize * 0.52)));
  if (label.length <= maxChars) return [label];

  const words = label.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [label];

  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > maxChars && cur) {
      lines.push(cur);
      cur = w;
      if (lines.length === 2) {
        // Dump remaining into line 2 with ellipsis if needed
        const idx = words.indexOf(w);
        const rest = words.slice(idx).join(" ");
        const clipped =
          rest.length > maxChars ? `${rest.slice(0, maxChars - 1)}…` : rest;
        lines[1] = clipped;
        return lines;
      }
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur.length > maxChars ? `${cur.slice(0, maxChars - 1)}…` : cur);
  return lines.slice(0, 2);
}

function SectionLabel({
  x,
  y,
  label,
  maxWidth,
}: {
  x: number;
  y: number;
  label: string;
  /** When set (stage), label sits on its own row and can use full staff width. */
  maxWidth?: number;
}) {
  const { units: u, labelAbove, labelColumn } = useEngraving();
  const maxW = maxWidth ?? Math.max(80, labelColumn - 24);
  const lines = wrapSectionLabel(label, maxW, u.fontSection);
  const lineH = u.fontSection * 1.15;
  // labelAbove: y is the baseline of the first line in the reserved label band.
  // else: sit just above the staff in the left margin.
  const baseY = labelAbove ? y : y - 10 - (lines.length - 1) * lineH;
  return (
    <g>
      {lines.map((line, i) => (
        <text
          key={i}
          x={x}
          y={baseY + i * lineH}
          fontFamily={SERIF}
          fontSize={u.fontSection}
          fontStyle="italic"
          fontWeight={700}
          fill="var(--chart-ink)"
        >
          {line}
        </text>
      ))}
      <line
        x1={x}
        x2={x + Math.min(maxW, labelAbove ? 280 : maxW)}
        y1={baseY + (lines.length - 1) * lineH + 10}
        y2={baseY + (lines.length - 1) * lineH + 10}
        stroke="var(--chart-ink)"
        strokeWidth={labelAbove ? 2 : 1}
      />
    </g>
  );
}

function Slashes({ measure, x, w, staffY }: { measure: LaidMeasure; x: number; w: number; staffY: number }) {
  const { units: u } = useEngraving();
  const m = measure.measure;
  if (m.slash === "rest") {
    // Whole-bar rest: filled block hanging from 2nd line from top.
    const cx = x + w / 2;
    return (
      <rect x={cx - 10} y={staffY + u.staffLine} width={20} height={u.staffLine * 0.55} fill="var(--chart-ink)" />
    );
  }
  if (m.slash === "simile") {
    // Simile mark: two dots + diagonal
    const cx = x + w / 2;
    const cy = staffY + u.staffHeight / 2;
    return (
      <g>
        <line x1={cx - 14} y1={cy + 12} x2={cx + 14} y2={cy - 12} stroke="var(--chart-ink)" strokeWidth={2.4} />
        <circle cx={cx - 12} cy={cy - 4} r={2.6} fill="var(--chart-ink)" />
        <circle cx={cx + 12} cy={cy + 4} r={2.6} fill="var(--chart-ink)" />
      </g>
    );
  }
  // Slash notation — one slash per beat, sitting on the middle staff line.
  const midY = staffY + u.staffHeight / 2;
  const inset = 18;
  const usable = w - inset * 2;
  const beats = m.beats;
  const step = beats > 1 ? usable / beats : usable;
  const items = [];
  for (let b = 0; b < beats; b++) {
    const cx = x + inset + step * b + step / 2;
    items.push(
      <line
        key={b}
        x1={cx - 7}
        y1={midY + 10}
        x2={cx + 7}
        y2={midY - 10}
        stroke="var(--chart-ink)"
        strokeWidth={u.strokeSlash}
        strokeLinecap="round"
      />,
    );
  }
  return <g>{items}</g>;
}

function Barline({
  x,
  y,
  height,
  kind,
}: {
  x: number;
  y: number;
  height: number;
  kind: "single" | "final" | "section" | "repeat-start" | "repeat-end";
}) {
  const { units: u } = useEngraving();
  if (kind === "final") {
    return (
      <g>
        <line x1={x - 6} x2={x - 6} y1={y} y2={y + height} stroke="var(--chart-ink)" strokeWidth={u.strokeBar} />
        <line x1={x} x2={x} y1={y} y2={y + height} stroke="var(--chart-ink)" strokeWidth={u.strokeBarThick} />
      </g>
    );
  }
  if (kind === "section") {
    return (
      <g>
        <line x1={x - 4} x2={x - 4} y1={y} y2={y + height} stroke="var(--chart-ink)" strokeWidth={u.strokeBar} />
        <line x1={x} x2={x} y1={y} y2={y + height} stroke="var(--chart-ink)" strokeWidth={u.strokeBar} />
      </g>
    );
  }
  if (kind === "repeat-start") {
    // Thick | thin then dots facing into the music
    const d1 = y + u.staffLine * 1.5;
    const d2 = y + u.staffLine * 2.5;
    return (
      <g>
        <line x1={x} x2={x} y1={y} y2={y + height} stroke="var(--chart-ink)" strokeWidth={u.strokeBarThick} />
        <line x1={x + 7} x2={x + 7} y1={y} y2={y + height} stroke="var(--chart-ink)" strokeWidth={u.strokeBar} />
        <circle cx={x + 16} cy={d1} r={2.8} fill="var(--chart-ink)" />
        <circle cx={x + 16} cy={d2} r={2.8} fill="var(--chart-ink)" />
      </g>
    );
  }
  if (kind === "repeat-end") {
    // Dots then thin | thick
    const d1 = y + u.staffLine * 1.5;
    const d2 = y + u.staffLine * 2.5;
    return (
      <g>
        <circle cx={x - 16} cy={d1} r={2.8} fill="var(--chart-ink)" />
        <circle cx={x - 16} cy={d2} r={2.8} fill="var(--chart-ink)" />
        <line x1={x - 7} x2={x - 7} y1={y} y2={y + height} stroke="var(--chart-ink)" strokeWidth={u.strokeBar} />
        <line x1={x} x2={x} y1={y} y2={y + height} stroke="var(--chart-ink)" strokeWidth={u.strokeBarThick} />
      </g>
    );
  }
  return <line x1={x} x2={x} y1={y} y2={y + height} stroke="var(--chart-ink)" strokeWidth={u.strokeBar} />;
}

function ChordSymbols({ measure, staffTop }: { measure: LaidMeasure; staffTop: number }) {
  const { units: u } = useEngraving();
  const m = measure.measure;
  if (m.chords.length === 0) return null;
  const y = staffTop - Math.max(18, Math.round(u.fontChord * 0.4));
  const gap = 12;
  const inset = 10;
  const minX = measure.x + inset;
  const maxRight = measure.x + measure.width - inset;

  let fontSize =
    m.chords.length >= 3 ? u.fontChord * 0.82 : m.chords.length === 2 ? u.fontChord * 0.92 : u.fontChord;

  let widths = m.chords.map((c) => estimateChordSymbolWidth(c.symbol, fontSize));
  const preferred = m.chords.map((c) => {
    const bx = measure.beatX[c.beat - 1] ?? measure.beatX[0] ?? measure.x + inset;
    return bx;
  });

  // Shrink font until every glyph fits without overlap — never stack symbols.
  for (let attempt = 0; attempt < 8; attempt++) {
    widths = m.chords.map((c) => estimateChordSymbolWidth(c.symbol, fontSize));
    if (chordsFitInSpan(widths, minX, maxRight, gap)) break;
    fontSize *= 0.9;
    if (fontSize < Math.max(16, u.fontChord * 0.55)) break;
  }

  const xs = resolveNonOverlappingChordXs(preferred, widths, minX, maxRight, gap);

  return (
    <g fontFamily={SERIF} fontWeight={700} fontSize={fontSize} fill="var(--chart-ink)">
      {m.chords.map((c, i) => (
        <text key={i} x={xs[i]} y={y} textAnchor="start">
          {c.symbol}
        </text>
      ))}
    </g>
  );
}

function MarkerRow({ measure, staffTop }: { measure: LaidMeasure; staffTop: number }) {
  const { units: u } = useEngraving();
  const m = measure.measure;
  const visible = m.markers.filter((mk) => mk.kind !== "repeat-start");
  if (visible.length === 0) return null;
  // Sit just above chord symbols
  const y = staffTop - u.chordRow + 14;
  return (
    <g fontFamily={SERIF} fontStyle="italic" fontSize={u.fontMarker} fill="var(--chart-ink)">
      {visible.map((mk, i) => {
        if (mk.kind === "repeat-end") {
          return (
            <text
              key={i}
              x={measure.x + measure.width - 8}
              y={y}
              textAnchor="end"
              fontStyle="normal"
              fontWeight={700}
            >
              {mk.text ?? "×2"}
            </text>
          );
        }
        const label =
          mk.text ??
          (mk.kind === "coda"
            ? "\u{1D10C}"
            : mk.kind === "segno"
              ? "\u{1D10B}"
              : mk.kind === "fermata"
                ? "\u{1D110}"
                : mk.kind === "repeat-count"
                  ? mk.text
                  : mk.kind);
        return (
          <text key={i} x={measure.x + 4 + i * 60} y={y}>
            {label}
          </text>
        );
      })}
    </g>
  );
}

/** Band notes above the staff — already localized/transposed in normalize. */
function SectionNotes({
  notes,
  x,
  staffTop,
  maxWidth,
}: {
  notes: string;
  x: number;
  staffTop: number;
  maxWidth: number;
}) {
  const { units: u } = useEngraving();
  const cleaned = localizeBandNotes(
    notes
      .replace(/\b(D\.C\.|D\.S\.|Fine|To\s*Coda|Coda|Segno|Fermata)\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim(),
  );
  if (!cleaned) return null;

  const maxChars = Math.max(28, Math.floor(maxWidth / (u.fontNotes * 0.48)));
  const lines: string[] = [];
  let cur = "";
  for (const wd of cleaned.split(/\s+/)) {
    const next = cur ? `${cur} ${wd}` : wd;
    if (next.length > maxChars && cur) {
      lines.push(cur);
      cur = wd;
      if (lines.length >= 2) {
        lines.push(wd.length > maxChars ? `${wd.slice(0, maxChars - 1)}…` : wd);
        cur = "";
        break;
      }
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);

  const lineH = u.fontNotes * 1.2;
  // Sit in the dedicated notes band above the chord row — not on measure numbers.
  const baseY = staffTop - u.chordRow - 14 - (lines.length - 1) * lineH;

  return (
    <g fontFamily={SERIF} fontStyle="italic" fontSize={u.fontNotes} fill="var(--chart-ink)">
      {lines.slice(0, 2).map((line, i) => (
        <text key={i} x={x} y={baseY + i * lineH} fontWeight={500}>
          {line}
        </text>
      ))}
    </g>
  );
}

function hasMarker(m: LaidMeasure, kind: string): boolean {
  return m.measure.markers.some((mk) => mk.kind === kind);
}

function firstMeasureHasRepeatStart(sys: System): boolean {
  const first = sys.measures[0];
  return !!first?.measure.markers.some((mk) => mk.kind === "repeat-start");
}

function MeasureNumber({
  measure,
  staffTop,
  forceShow,
  liftForNotes,
}: {
  measure: LaidMeasure;
  staffTop: number;
  forceShow: boolean;
  /** When band notes occupy the upper band, keep numbers just above chords. */
  liftForNotes: boolean;
}) {
  const { units: u } = useEngraving();
  const n = measure.measure.number;
  if (!forceShow && n % 4 !== 1) return null;
  // Default: above chord glyphs. With notes present, stay in the chord band
  // so we never collide with SectionNotes.
  const y = liftForNotes ? staffTop - 34 : staffTop - u.chordRow - 12;
  return (
    <text
      x={measure.x + 2}
      y={y}
      fontFamily={SERIF}
      fontSize={u.fontMeasureNo}
      fontWeight={600}
      fill="var(--chart-muted)"
    >
      {n}
    </text>
  );
}

function LyricLine({
  system,
  staffTop,
  lyrics,
  lyricGapScale,
  contentWidth,
}: {
  system: System;
  staffTop: number;
  lyrics: string;
  lyricGapScale: number;
  contentWidth: number;
}) {
  const { units: u } = useEngraving();
  if (!lyrics.trim()) return null;
  const gap = u.lyricGap * lyricGapScale;
  const fontSize = u.fontLyric * Math.max(0.92, lyricGapScale);
  const startX = system.measures[0]?.x ?? 0;
  const lines = wrapLyricToWidth(
    lyrics,
    contentWidth,
    fontSize,
    u.lyricCharWidth,
    u.maxLyricWrapLines,
  );
  const lineH = fontSize * 1.2;
  const y0 = staffTop + u.staffHeight + gap;

  return (
    <g fontFamily={SERIF} fontStyle="italic" fontSize={fontSize} fill="var(--chart-ink)">
      {lines.map((line, i) => (
        <text key={i} x={startX} y={y0 + i * lineH}>
          {line}
        </text>
      ))}
    </g>
  );
}

/* --- Full system --------------------------------------------------------- */
function SystemBlock({
  positioned,
  totalMeasures,
  showTimeSig,
  score,
  showLyrics,
  density,
}: {
  positioned: PositionedSystem;
  totalMeasures: number;
  showTimeSig: boolean;
  score: NormalizedScore;
  showLyrics: boolean;
  density: DensityPreset;
}) {
  const { units: u, labelColumn, labelAbove } = useEngraving();
  const sys = positioned.system;
  const originX = positioned.x;
  const hasNotes = !!sys.sectionNotes?.trim();
  const notesPad = hasNotes ? u.notesRow + 18 : 0;
  const labelPad =
    labelAbove && sys.isSectionStart ? u.sectionLabelAbove : 0;
  const staffTop = positioned.y + labelPad + notesPad + u.chordRow;

  const clefX = originX + labelColumn;
  const keyX = clefX + CLEF_W;
  const kw = keySigWidth(score.header.key);
  const timeX = keyX + kw;
  const measuresStartX = timeX + TIMESIG_W;
  const measuresWidth = sys.contentWidth;

  const openKind: "single" | "repeat-start" =
    sys.isSectionStart && firstMeasureHasRepeatStart(sys) ? "repeat-start" : "single";

  return (
    <g>
      {sys.isSectionStart && (
        <SectionLabel
          x={labelAbove ? originX : originX}
          y={labelAbove ? positioned.y + u.fontSection : staffTop}
          label={sys.sectionLabel}
          maxWidth={labelAbove ? measuresStartX + measuresWidth - originX : undefined}
        />
      )}

      {sys.isSectionStart && sys.sectionNotes && (
        <SectionNotes
          notes={sys.sectionNotes}
          x={measuresStartX}
          staffTop={staffTop}
          maxWidth={measuresWidth}
        />
      )}

      <StaffLines x={clefX} y={staffTop} w={measuresStartX + measuresWidth - clefX} />
      <TrebleClef x={clefX + 6} y={staffTop} />
      <KeySignature x={keyX} y={staffTop} keyName={score.header.key} />
      {showTimeSig && <TimeSignature x={timeX} y={staffTop} ts={score.header.timeSig} />}

      <Barline x={measuresStartX} y={staffTop} height={u.staffHeight} kind={openKind} />

      {sys.measures.map((lm, i) => {
        const shifted: LaidMeasure = {
          ...lm,
          x: measuresStartX + lm.x,
          beatX: lm.beatX.map((bx) => measuresStartX + bx),
        };
        const isLastOfPiece = shifted.measure.number === totalMeasures;
        const endsRepeat = hasMarker(shifted, "repeat-end");
        const barlineKind: "single" | "final" | "section" | "repeat-end" = endsRepeat
          ? "repeat-end"
          : isLastOfPiece
            ? "final"
            : shifted.measure.endsSection
              ? "section"
              : "single";
        const barX = shifted.x + shifted.width;
        return (
          <g key={i}>
            <MeasureNumber
              measure={shifted}
              staffTop={staffTop}
              forceShow={i === 0}
              liftForNotes={hasNotes}
            />
            <MarkerRow measure={shifted} staffTop={staffTop} />
            <ChordSymbols measure={shifted} staffTop={staffTop} />
            <Slashes measure={shifted} x={shifted.x} w={shifted.width} staffY={staffTop} />
            <Barline x={barX} y={staffTop} height={u.staffHeight} kind={barlineKind} />
          </g>
        );
      })}

      {showLyrics && sys.sectionLyrics && (
        <LyricLine
          system={{
            ...sys,
            measures: sys.measures.map((lm) => ({
              ...lm,
              x: measuresStartX + lm.x,
              beatX: lm.beatX.map((bx) => measuresStartX + bx),
            })),
          }}
          staffTop={staffTop}
          lyrics={sys.sectionLyrics}
          lyricGapScale={density.lyricGapScale}
          contentWidth={measuresWidth}
        />
      )}
    </g>
  );
}

/* --- Header block -------------------------------------------------------- */
function Header({ score, density }: { score: NormalizedScore; density: DensityPreset }) {
  const { units: u } = useEngraving();
  const h = score.header;
  const cx = PAGE.width / 2;
  const top = density.marginTop;
  const meta = [
    `Key: ${h.key}`,
    `${h.bpm} BPM`,
    h.timeSig,
    h.capo ? `Capo ${h.capo}` : null,
    h.feel ?? null,
  ]
    .filter(Boolean)
    .join("   \u00B7   ");
  return (
    <g>
      <text
        x={cx}
        y={top + 52}
        textAnchor="middle"
        fontFamily={SERIF}
        fontSize={u.fontTitle}
        fontWeight={700}
        fill="var(--chart-ink)"
      >
        {h.title}
      </text>
      {h.artist && (
        <text
          x={PAGE.width - PAGE.marginX}
          y={top + 18}
          textAnchor="end"
          fontFamily={SERIF}
          fontStyle="italic"
          fontSize={u.fontArtist}
          fill="var(--chart-ink)"
        >
          {h.artist}
        </text>
      )}
      <text
        x={cx}
        y={top + 96}
        textAnchor="middle"
        fontFamily={SERIF}
        fontSize={u.fontMeta}
        fill="var(--chart-ink)"
      >
        {meta}
      </text>
      <line
        x1={PAGE.marginX}
        x2={PAGE.width - PAGE.marginX}
        y1={top + density.headerHeight - 36}
        y2={top + density.headerHeight - 36}
        stroke="var(--chart-ink)"
        strokeWidth={1}
      />
    </g>
  );
}

/* --- Page ---------------------------------------------------------------- */
export function LeadSheetSvg({
  score,
  pages,
  showLyrics,
  density = DENSITY_PRESETS[0],
  theme = "paper",
  pageHeights,
  continuous = false,
  stageLayout = false,
}: Props) {
  const t = CHART_THEMES[theme];
  const cssVars = {
    ["--chart-ink" as string]: t.ink,
    ["--chart-muted" as string]: t.muted,
    ["--chart-page" as string]: t.page,
  };
  const engraving: EngravingCtx = {
    units: stageLayout ? STAGE_UNIT : UNIT,
    labelColumn: stageLayout ? 0 : PRINT_LABEL_W,
    labelAbove: stageLayout,
  };

  return (
    <EngravingContext.Provider value={engraving}>
      <div style={{ background: t.page, ...cssVars }}>
        {pages.map((page) => {
          const pageH = pageHeights?.[page.index] ?? PAGE.height;
          return (
            <div
              key={page.index}
              data-pdf-section
              style={{
                width: continuous ? "100%" : `${PAGE.width / 10}mm`,
                background: t.page,
                marginBottom: continuous ? 0 : 24,
              }}
            >
              {/* CSS vars must live on <svg> so PDF export (standalone SVG→PNG) keeps strokes. */}
              <svg
                viewBox={`0 0 ${PAGE.width} ${pageH}`}
                width="100%"
                xmlns="http://www.w3.org/2000/svg"
                style={{
                  display: "block",
                  background: t.page,
                  ...cssVars,
                  // Explicit aspect so continuous Live sheets get real layout height.
                  ...(continuous
                    ? { aspectRatio: `${PAGE.width} / ${pageH}`, height: "auto" }
                    : null),
                }}
              >
                <rect x={0} y={0} width={PAGE.width} height={pageH} fill={t.page} />
                {page.showHeader && <Header score={score} density={density} />}
                {page.systems.map((ps, i) => {
                  // Time signature only at the very start of the piece (bar 1).
                  const showTimeSig = ps.system.measures[0]?.measure.number === 1;
                  return (
                    <SystemBlock
                      key={i}
                      positioned={ps}
                      totalMeasures={score.totalMeasures}
                      showTimeSig={showTimeSig}
                      score={score}
                      showLyrics={showLyrics}
                      density={density}
                    />
                  );
                })}
              </svg>
            </div>
          );
        })}
      </div>
    </EngravingContext.Provider>
  );
}
