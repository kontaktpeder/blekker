import type { NormalizedScore } from "../model";
import type { PositionedSystem, Page } from "../paginate";
import { PAGE } from "../paginate";
import type { LaidMeasure, System } from "../layout";
import { UNIT, SERIF } from "./typography";
import { KEY_ACCIDENTALS } from "./glyphs";

interface Props {
  score: NormalizedScore;
  pages: Page[];
  showLyrics: boolean;
}

/* --- Musical prefix widths ------------------------------------------------ */
const LABEL_W = 180;
const CLEF_W = 90;
const KEYSIG_STEP = 20;
const TIMESIG_W = 70;

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
  const cy = y + UNIT.staffLine * 3; // 4th line from top = G line
  return (
    <text
      x={x}
      y={cy + 22}
      fontFamily="'Bravura Text','Noto Music','Segoe UI Symbol','Apple Symbols',serif"
      fontSize={90}
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
  return (
    <g fontFamily={SERIF} fontWeight={700} fontSize={34} fill="#000" textAnchor="middle">
      <text x={x + TIMESIG_W / 2} y={y + UNIT.staffLine * 2 + 4}>{num}</text>
      <text x={x + TIMESIG_W / 2} y={y + UNIT.staffLine * 4 + 4}>{den ?? "4"}</text>
    </g>
  );
}

function SectionLabel({ x, y, label }: { x: number; y: number; label: string }) {
  // Left-margin label. Uppercase, small caps look via bold serif + tracking.
  return (
    <g>
      <text
        x={x}
        y={y + UNIT.staffLine * 2}
        fontFamily={SERIF}
        fontSize={UNIT.fontSection}
        fontStyle="italic"
        fill="#000"
      >
        {label}
      </text>
      <line
        x1={x}
        x2={x + LABEL_W - 20}
        y1={y + UNIT.staffLine * 2 + 12}
        y2={y + UNIT.staffLine * 2 + 12}
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

function Barline({ x, y, height, kind }: { x: number; y: number; height: number; kind: "single" | "final" | "section" }) {
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
  return <line x1={x} x2={x} y1={y} y2={y + height} stroke="#000" strokeWidth={1.4} />;
}

function ChordSymbols({ measure, staffTop }: { measure: LaidMeasure; staffTop: number }) {
  const m = measure.measure;
  if (m.chords.length === 0) return null;
  const y = staffTop - 14;
  return (
    <g fontFamily={SERIF} fontWeight={700} fontSize={UNIT.fontChord} fill="#000">
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
  if (m.markers.length === 0) return null;
  const y = staffTop - UNIT.chordRow - 8;
  return (
    <g fontFamily={SERIF} fontStyle="italic" fontSize={UNIT.fontMarker} fill="#000">
      {m.markers.map((mk, i) => {
        const label =
          mk.text ??
          (mk.kind === "coda"
            ? "\u{1D10C}"
            : mk.kind === "segno"
              ? "\u{1D10B}"
              : mk.kind === "fermata"
                ? "\u{1D110}"
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

function MeasureNumber({ measure, staffTop, forceShow }: { measure: LaidMeasure; staffTop: number; forceShow: boolean }) {
  const n = measure.measure.number;
  if (!forceShow && n % 4 !== 1) return null;
  return (
    <text
      x={measure.x + 4}
      y={staffTop - UNIT.chordRow - UNIT.markerRow - 4}
      fontFamily={SERIF}
      fontSize={UNIT.fontMeasureNo}
      fill="#000"
    >
      {n}
    </text>
  );
}

function LyricLine({ system, staffTop, lyrics }: { system: System; staffTop: number; lyrics: string }) {
  if (!lyrics) return null;
  const y = staffTop + UNIT.staffHeight + UNIT.lyricGap;
  const startX = system.measures[0]?.x ?? 0;
  const w = system.contentWidth;
  // Simple word-wrap by character count (heuristic — no font metrics available
  // during SVG-to-canvas rasterization). ~54 chars fits per system width.
  const lines: string[] = [];
  const rawLines = lyrics.split(/\n/);
  const maxChars = Math.max(20, Math.floor(w / (UNIT.fontLyric * 0.55)));
  for (const raw of rawLines) {
    const words = raw.split(/\s+/);
    let cur = "";
    for (const wd of words) {
      if ((cur + " " + wd).trim().length > maxChars) {
        if (cur) lines.push(cur);
        cur = wd;
      } else {
        cur = cur ? cur + " " + wd : wd;
      }
    }
    if (cur) lines.push(cur);
  }
  return (
    <g fontFamily={SERIF} fontStyle="italic" fontSize={UNIT.fontLyric} fill="#000">
      {lines.map((line, i) => (
        <text key={i} x={startX} y={y + i * (UNIT.fontLyric * 1.25)}>
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
}: {
  positioned: PositionedSystem;
  totalMeasures: number;
  showTimeSig: boolean;
  score: NormalizedScore;
  showLyrics: boolean;
}) {
  const sys = positioned.system;
  const originX = positioned.x;
  const staffTop = positioned.y + UNIT.markerRow + UNIT.chordRow;

  // Prefix positions inside the system:
  const labelX = originX;
  const clefX = originX + LABEL_W;
  const keyX = clefX + CLEF_W;
  const kw = keySigWidth(score.header.key);
  const timeX = keyX + kw;
  const measuresStartX = timeX + TIMESIG_W; // always reserve, keeps systems aligned
  const measuresWidth = sys.contentWidth;

  // Section label + barline start
  return (
    <g>
      {sys.isSectionStart && (
        <SectionLabel x={labelX} y={staffTop} label={sys.sectionLabel} />
      )}

      <StaffLines x={clefX} y={staffTop} w={measuresStartX + measuresWidth - clefX} />
      <TrebleClef x={clefX + 8} y={staffTop} />
      <KeySignature x={keyX} y={staffTop} keyName={score.header.key} />
      {showTimeSig && <TimeSignature x={timeX} y={staffTop} ts={score.header.timeSig} />}

      {/* Opening barline */}
      <Barline x={measuresStartX} y={staffTop} height={UNIT.staffHeight} kind="single" />

      {sys.measures.map((lm, i) => {
        const shifted: LaidMeasure = {
          ...lm,
          x: measuresStartX + lm.x,
          beatX: lm.beatX.map((bx) => measuresStartX + bx),
        };
        const isLastOfPiece = shifted.measure.number === totalMeasures;
        const barlineKind: "single" | "final" | "section" = isLastOfPiece
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
        />
      )}
    </g>
  );
}

/* --- Header block -------------------------------------------------------- */
function Header({ score }: { score: NormalizedScore }) {
  const h = score.header;
  const cx = PAGE.width / 2;
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
        y={PAGE.marginTop + 60}
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
          y={PAGE.marginTop + 20}
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
        y={PAGE.marginTop + 110}
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
        y1={PAGE.marginTop + 150}
        y2={PAGE.marginTop + 150}
        stroke="#000"
        strokeWidth={1}
      />
    </g>
  );
}

/* --- Page ---------------------------------------------------------------- */
export function LeadSheetSvg({ score, pages, showLyrics }: Props) {
  return (
    <div style={{ background: "#fff" }}>
      {pages.map((page) => {
        // The first system of each section on this page shows time signature.
        const seenSection = new Set<string>();
        return (
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
              {page.showHeader && <Header score={score} />}
              {page.systems.map((ps, i) => {
                const firstOfSection = !seenSection.has(ps.system.sectionId);
                seenSection.add(ps.system.sectionId);
                return (
                  <SystemBlock
                    key={i}
                    positioned={ps}
                    totalMeasures={score.totalMeasures}
                    showTimeSig={firstOfSection}
                    score={score}
                    showLyrics={showLyrics}
                  />
                );
              })}
            </svg>
          </div>
        );
      })}
    </div>
  );
}
