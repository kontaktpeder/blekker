import type { NormalizedScore } from "../model";
import type { PositionedSystem, Page, DensityPreset } from "../paginate";
import { PAGE, DENSITY_PRESETS } from "../paginate";
import type { LaidMeasure, System } from "../layout";
import { wrapLyricToWidth } from "../layout";
import { UNIT, SERIF } from "./typography";
import { KEY_ACCIDENTALS } from "./glyphs";
import { localizeBandNotes } from "@/lib/band-notes-no";

interface Props {
  score: NormalizedScore;
  pages: Page[];
  showLyrics: boolean;
  density?: DensityPreset;
}

/* --- Musical prefix widths (must match LeadSheetChart) ------------------- */
const LABEL_W = 170;
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
  const lines = [];
  for (let i = 0; i < 5; i++) {
    const ly = y + i * UNIT.staffLine;
    lines.push(
      <line
        key={i}
        x1={x}
        x2={x + w}
        y1={ly}
        y2={ly}
        stroke="#000"
        strokeWidth={1.4}
      />,
    );
  }
  return <g>{lines}</g>;
}

function TrebleClef({ x, y }: { x: number; y: number }) {
  // Y is the staff top. Clef sits centered on the G-line (2nd from bottom).
  const cy = y + UNIT.staffLine * 3;
  return (
    <text
      x={x}
      y={cy + 18}
      fontFamily="'Bravura Text','Noto Music','Segoe UI Symbol','Apple Symbols',serif"
      fontSize={78}
      fill="#000"
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
          fill="#000"
        >
          {glyph}
        </text>
      ))}
    </g>
  );
}

function TimeSignature({ x, y, ts }: { x: number; y: number; ts: string }) {
  const [num, den] = ts.split("/");
  const cx = x + TIMESIG_W / 2;
  const fs = UNIT.fontTimeSig;
  // Digits centered in upper / lower staff halves (staff height = 4×staffLine).
  // Baselines chosen so Georgia bold stays inside the five lines when rasterized.
  return (
    <g fontFamily={SERIF} fontWeight={700} fontSize={fs} fill="#000" textAnchor="middle">
      <text x={cx} y={y + UNIT.staffLine * 2 - 2}>
        {num}
      </text>
      <text x={cx} y={y + UNIT.staffLine * 4 - 2}>
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

function SectionLabel({ x, y, label }: { x: number; y: number; label: string }) {
  const maxW = LABEL_W - 24;
  const lines = wrapSectionLabel(label, maxW, UNIT.fontSection);
  const lineH = UNIT.fontSection * 1.15;
  // Sit above the staff in the left margin so staff lines never cut through the label.
  const baseY = y - 10 - (lines.length - 1) * lineH;
  return (
    <g>
      {lines.map((line, i) => (
        <text
          key={i}
          x={x}
          y={baseY + i * lineH}
          fontFamily={SERIF}
          fontSize={UNIT.fontSection}
          fontStyle="italic"
          fill="#000"
        >
          {line}
        </text>
      ))}
      <line
        x1={x}
        x2={x + maxW}
        y1={baseY + (lines.length - 1) * lineH + 10}
        y2={baseY + (lines.length - 1) * lineH + 10}
        stroke="#000"
        strokeWidth={1}
      />
    </g>
  );
}

function Slashes({ measure, x, w, staffY }: { measure: LaidMeasure; x: number; w: number; staffY: number }) {
  const m = measure.measure;
  if (m.slash === "rest") {
    // Whole-bar rest: filled block hanging from 2nd line from top.
    const cx = x + w / 2;
    return (
      <rect x={cx - 10} y={staffY + UNIT.staffLine} width={20} height={UNIT.staffLine * 0.55} fill="#000" />
    );
  }
  if (m.slash === "simile") {
    // Simile mark: two dots + diagonal
    const cx = x + w / 2;
    const cy = staffY + UNIT.staffHeight / 2;
    return (
      <g>
        <line x1={cx - 14} y1={cy + 12} x2={cx + 14} y2={cy - 12} stroke="#000" strokeWidth={2.4} />
        <circle cx={cx - 12} cy={cy - 4} r={2.6} fill="#000" />
        <circle cx={cx + 12} cy={cy + 4} r={2.6} fill="#000" />
      </g>
    );
  }
  // Slash notation — one slash per beat, sitting on the middle staff line.
  const midY = staffY + UNIT.staffHeight / 2;
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
        stroke="#000"
        strokeWidth={2.6}
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
  if (kind === "final") {
    return (
      <g>
        <line x1={x - 6} x2={x - 6} y1={y} y2={y + height} stroke="#000" strokeWidth={1.4} />
        <line x1={x} x2={x} y1={y} y2={y + height} stroke="#000" strokeWidth={4} />
      </g>
    );
  }
  if (kind === "section") {
    return (
      <g>
        <line x1={x - 4} x2={x - 4} y1={y} y2={y + height} stroke="#000" strokeWidth={1.4} />
        <line x1={x} x2={x} y1={y} y2={y + height} stroke="#000" strokeWidth={1.4} />
      </g>
    );
  }
  if (kind === "repeat-start") {
    // Thick | thin then dots facing into the music
    const d1 = y + UNIT.staffLine * 1.5;
    const d2 = y + UNIT.staffLine * 2.5;
    return (
      <g>
        <line x1={x} x2={x} y1={y} y2={y + height} stroke="#000" strokeWidth={4} />
        <line x1={x + 7} x2={x + 7} y1={y} y2={y + height} stroke="#000" strokeWidth={1.4} />
        <circle cx={x + 16} cy={d1} r={2.8} fill="#000" />
        <circle cx={x + 16} cy={d2} r={2.8} fill="#000" />
      </g>
    );
  }
  if (kind === "repeat-end") {
    // Dots then thin | thick
    const d1 = y + UNIT.staffLine * 1.5;
    const d2 = y + UNIT.staffLine * 2.5;
    return (
      <g>
        <circle cx={x - 16} cy={d1} r={2.8} fill="#000" />
        <circle cx={x - 16} cy={d2} r={2.8} fill="#000" />
        <line x1={x - 7} x2={x - 7} y1={y} y2={y + height} stroke="#000" strokeWidth={1.4} />
        <line x1={x} x2={x} y1={y} y2={y + height} stroke="#000" strokeWidth={4} />
      </g>
    );
  }
  return <line x1={x} x2={x} y1={y} y2={y + height} stroke="#000" strokeWidth={1.4} />;
}

function ChordSymbols({ measure, staffTop }: { measure: LaidMeasure; staffTop: number }) {
  const m = measure.measure;
  if (m.chords.length === 0) return null;
  const y = staffTop - 18;
  // Slightly smaller when a walkdown packs 3+ symbols into one bar.
  const fontSize =
    m.chords.length >= 3 ? UNIT.fontChord * 0.82 : m.chords.length === 2 ? UNIT.fontChord * 0.92 : UNIT.fontChord;
  return (
    <g fontFamily={SERIF} fontWeight={700} fontSize={fontSize} fill="#000">
      {m.chords.map((c, i) => {
        const bx = measure.beatX[c.beat - 1] ?? measure.beatX[0];
        return (
          <text key={i} x={measure.x + (bx - measure.x)} y={y} textAnchor="start">
            {c.symbol}
          </text>
        );
      })}
    </g>
  );
}

function MarkerRow({ measure, staffTop }: { measure: LaidMeasure; staffTop: number }) {
  const m = measure.measure;
  const visible = m.markers.filter((mk) => mk.kind !== "repeat-start");
  if (visible.length === 0) return null;
  // Sit just above chord symbols
  const y = staffTop - UNIT.chordRow + 14;
  return (
    <g fontFamily={SERIF} fontStyle="italic" fontSize={UNIT.fontMarker} fill="#000">
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

/** Band notes above the staff — Norwegian musician speak. */
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
  const cleaned = localizeBandNotes(
    notes
      .replace(/\b(D\.C\.|D\.S\.|Fine|To\s*Coda|Coda|Segno|Fermata)\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim(),
  );
  if (!cleaned) return null;

  const maxChars = Math.max(28, Math.floor(maxWidth / (UNIT.fontNotes * 0.48)));
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

  const lineH = UNIT.fontNotes * 1.2;
  const baseY = staffTop - UNIT.chordRow - 8 - (lines.length - 1) * lineH;

  return (
    <g fontFamily={SERIF} fontStyle="italic" fontSize={UNIT.fontNotes} fill="#000">
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
}: {
  measure: LaidMeasure;
  staffTop: number;
  forceShow: boolean;
}) {
  const n = measure.measure.number;
  if (!forceShow && n % 4 !== 1) return null;
  // Sit well above the chord row so numbers never hide inside chord symbols.
  return (
    <text
      x={measure.x + 2}
      y={staffTop - UNIT.chordRow - 12}
      fontFamily={SERIF}
      fontSize={UNIT.fontMeasureNo}
      fontWeight={600}
      fill="#444"
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
  if (!lyrics.trim()) return null;
  const gap = UNIT.lyricGap * lyricGapScale;
  const fontSize = UNIT.fontLyric * Math.max(0.92, lyricGapScale);
  const startX = system.measures[0]?.x ?? 0;
  const lines = wrapLyricToWidth(
    lyrics,
    contentWidth,
    fontSize,
    UNIT.lyricCharWidth,
    UNIT.maxLyricWrapLines,
  );
  const lineH = fontSize * 1.2;
  const y0 = staffTop + UNIT.staffHeight + gap;

  return (
    <g fontFamily={SERIF} fontStyle="italic" fontSize={fontSize} fill="#000">
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
  const sys = positioned.system;
  const originX = positioned.x;
  const notesPad = sys.sectionNotes?.trim() ? UNIT.notesRow : 0;
  const staffTop = positioned.y + notesPad + UNIT.chordRow;

  const labelX = originX;
  const clefX = originX + LABEL_W;
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
        <SectionLabel x={labelX} y={staffTop} label={sys.sectionLabel} />
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

      <Barline x={measuresStartX} y={staffTop} height={UNIT.staffHeight} kind={openKind} />

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
            <MeasureNumber measure={shifted} staffTop={staffTop} forceShow={i === 0} />
            <MarkerRow measure={shifted} staffTop={staffTop} />
            <ChordSymbols measure={shifted} staffTop={staffTop} />
            <Slashes measure={shifted} x={shifted.x} w={shifted.width} staffY={staffTop} />
            <Barline x={barX} y={staffTop} height={UNIT.staffHeight} kind={barlineKind} />
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
        fontSize={UNIT.fontTitle}
        fontWeight={700}
        fill="#000"
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
          fontSize={UNIT.fontArtist}
          fill="#000"
        >
          {h.artist}
        </text>
      )}
      <text
        x={cx}
        y={top + 96}
        textAnchor="middle"
        fontFamily={SERIF}
        fontSize={UNIT.fontMeta}
        fill="#000"
      >
        {meta}
      </text>
      <line
        x1={PAGE.marginX}
        x2={PAGE.width - PAGE.marginX}
        y1={top + density.headerHeight - 36}
        y2={top + density.headerHeight - 36}
        stroke="#000"
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
}: Props) {
  return (
    <div style={{ background: "#fff" }}>
      {pages.map((page) => (
        <div
          key={page.index}
          data-pdf-section
          style={{
            width: `${PAGE.width / 10}mm`,
            background: "#fff",
            marginBottom: 24,
          }}
        >
          <svg
            viewBox={`0 0 ${PAGE.width} ${PAGE.height}`}
            width="100%"
            xmlns="http://www.w3.org/2000/svg"
            style={{ display: "block", background: "#fff" }}
          >
            <rect x={0} y={0} width={PAGE.width} height={PAGE.height} fill="#fff" />
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
      ))}
    </div>
  );
}
