import { transposeChord, transposeKey, type Section, type Song } from "@/lib/music";
import type { LeadSheetVariant } from "@/lib/pdf/layouts/types";

interface Props {
  song: Song;
  semitones: number;
  showLyrics: boolean;
  variant?: LeadSheetVariant;
}

const SERIF = "Georgia, 'Times New Roman', Times, serif";
const BARS_PER_ROW = 4;
const PAGE_W = 794; // A4 width @96dpi

/* ------------------------------------------------------------------ */
/*  Normalized chart model                                             */
/* ------------------------------------------------------------------ */

interface NBar {
  number: number;
  chords: string[];
  slashPattern: "slashes" | "simile" | "rest";
}

interface NSection {
  label: string;
  repeat?: number;
  notes?: string;
  lyrics?: string;
  bars: NBar[];
}

interface NChart {
  title: string;
  artist?: string;
  key: string;
  bpm: number;
  timeSig: string;
  capo?: number;
  sections: NSection[];
}

function normalize(song: Song, semitones: number): NChart {
  let bar = 1;
  const sections: NSection[] = song.sections.map((s: Section) => {
    const bars: NBar[] = s.chords.map((c) => {
      const b: NBar = {
        number: bar++,
        chords: [],
        slashPattern: "slashes",
      };
      if (c === "%") b.slashPattern = "simile";
      else if (c === "-" || c === "") b.slashPattern = "rest";
      else b.chords = [transposeChord(c, semitones)];
      return b;
    });
    if (bars.length === 0) {
      bars.push({ number: bar++, chords: [], slashPattern: "rest" });
    }
    return {
      label: s.name,
      repeat: s.repeat,
      notes: s.notes,
      lyrics: s.lyrics,
      bars,
    };
  });
  return {
    title: song.title,
    artist: song.artist,
    key: transposeKey(song.key, semitones),
    bpm: song.bpm,
    timeSig: song.timeSig ?? "4/4",
    capo: song.capo,
    sections,
  };
}

/* ------------------------------------------------------------------ */
/*  Common header                                                      */
/* ------------------------------------------------------------------ */

function Header({ chart }: { chart: NChart }) {
  return (
    <header
      data-pdf-section
      style={{
        position: "relative",
        textAlign: "center",
        marginBottom: 26,
        paddingBottom: 4,
      }}
    >
      <h1
        style={{
          margin: 0,
          fontSize: 36,
          fontWeight: 400,
          letterSpacing: "0.01em",
          fontFamily: SERIF,
        }}
      >
        {chart.title}
      </h1>
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 14,
          fontSize: 13,
          fontStyle: "italic",
          fontFamily: SERIF,
        }}
      >
        {chart.artist}
      </div>
      <div
        style={{
          marginTop: 6,
          display: "flex",
          justifyContent: "center",
          gap: 20,
          fontSize: 13,
          fontStyle: "italic",
          fontFamily: SERIF,
        }}
      >
        <span>Key: {chart.key}</span>
        <span>♩ = {chart.bpm}</span>
        <span>{chart.timeSig}</span>
        {chart.capo ? <span>Capo {chart.capo}</span> : null}
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/*  Row splitting                                                      */
/* ------------------------------------------------------------------ */

function chunkBars(bars: NBar[], per = BARS_PER_ROW): NBar[][] {
  const rows: NBar[][] = [];
  for (let i = 0; i < bars.length; i += per) rows.push(bars.slice(i, i + per));
  if (rows.length === 0) rows.push([]);
  return rows;
}

/* ------------------------------------------------------------------ */
/*  LYRIC VARIANT  — like "Bare Så Du Vett Det"                        */
/* ------------------------------------------------------------------ */

function LyricRow({
  section,
  bars,
  isFirstRow,
  isLastRow,
  showLyrics,
}: {
  section: NSection;
  bars: NBar[];
  isFirstRow: boolean;
  isLastRow: boolean;
  showLyrics: boolean;
}) {
  const LABEL_W = 96;
  const viewW = 1000;
  const viewH = 32;
  const barW = viewW / BARS_PER_ROW;

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, breakInside: "avoid" }}>
      {/* Left column: section label */}
      <div style={{ width: LABEL_W, paddingTop: 18 }}>
        {isFirstRow ? (
          <div
            style={{
              borderTop: "1.5px solid #000",
              borderBottom: "1.5px solid #000",
              textAlign: "center",
              padding: "6px 8px",
              fontFamily: SERIF,
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: "0.02em",
            }}
          >
            {section.label}
            {section.repeat && section.repeat > 1 ? ` ×${section.repeat}` : ""}
          </div>
        ) : null}
      </div>

      {/* Right: bar numbers, chord names, single-line staff */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Bar numbers */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${BARS_PER_ROW}, 1fr)`,
            fontFamily: SERIF,
            fontSize: 11,
            fontStyle: "italic",
            marginBottom: 2,
          }}
        >
          {Array.from({ length: BARS_PER_ROW }).map((_, i) => (
            <div key={i} style={{ paddingLeft: 4 }}>
              {bars[i]?.number ?? ""}
            </div>
          ))}
        </div>
        {/* Chord names */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${BARS_PER_ROW}, 1fr)`,
            fontFamily: SERIF,
            fontSize: 17,
            fontWeight: 700,
            minHeight: 24,
          }}
        >
          {Array.from({ length: BARS_PER_ROW }).map((_, i) => {
            const b = bars[i];
            if (!b) return <div key={i} />;
            return (
              <div key={i} style={{ paddingLeft: 6 }}>
                {b.chords.join(" ")}
              </div>
            );
          })}
        </div>
        {/* Single thick staff line with slashes */}
        <svg
          viewBox={`0 0 ${viewW} ${viewH}`}
          width="100%"
          height={viewH}
          preserveAspectRatio="none"
          style={{ display: "block", marginTop: 2 }}
        >
          {/* thick horizontal line */}
          <line
            x1={0}
            x2={viewW}
            y1={viewH / 2}
            y2={viewH / 2}
            stroke="#000"
            strokeWidth={2.2}
          />
          {/* end cap */}
          <line
            x1={viewW - 1}
            x2={viewW - 1}
            y1={viewH / 2 - 5}
            y2={viewH / 2 + 5}
            stroke="#000"
            strokeWidth={2}
          />
          <line
            x1={0.5}
            x2={0.5}
            y1={viewH / 2 - 5}
            y2={viewH / 2 + 5}
            stroke="#000"
            strokeWidth={2}
          />
          {/* Slash per bar (single big slash centered) */}
          {bars.map((b, i) => {
            const cx = i * barW + barW / 2;
            const cy = viewH / 2;
            if (b.slashPattern === "rest") {
              return (
                <rect
                  key={i}
                  x={cx - 7}
                  y={cy - 4}
                  width={14}
                  height={4}
                  fill="#000"
                />
              );
            }
            if (b.slashPattern === "simile") {
              return (
                <g key={i}>
                  <line
                    x1={cx - 10}
                    y1={cy + 8}
                    x2={cx + 10}
                    y2={cy - 8}
                    stroke="#000"
                    strokeWidth={2.5}
                  />
                  <circle cx={cx - 6} cy={cy - 6} r={1.8} fill="#000" />
                  <circle cx={cx + 6} cy={cy + 6} r={1.8} fill="#000" />
                </g>
              );
            }
            return (
              <line
                key={i}
                x1={cx - 10}
                y1={cy + 8}
                x2={cx + 10}
                y2={cy - 8}
                stroke="#000"
                strokeWidth={3}
              />
            );
          })}
        </svg>

        {/* Lyrics below system on last row only */}
        {isLastRow && showLyrics && section.lyrics ? (
          <div
            style={{
              marginTop: 10,
              fontFamily: SERIF,
              fontSize: 13,
              lineHeight: 1.4,
              whiteSpace: "pre-line",
            }}
          >
            {section.lyrics}
          </div>
        ) : null}

        {isLastRow && section.notes ? (
          <div
            style={{
              marginTop: 6,
              fontFamily: SERIF,
              fontSize: 12,
              fontStyle: "italic",
            }}
          >
            {section.notes}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LyricSheet({ chart, showLyrics }: { chart: NChart; showLyrics: boolean }) {
  return (
    <div
      style={{
        width: PAGE_W,
        padding: "44px 56px",
        background: "#fff",
        color: "#000",
        fontFamily: SERIF,
        boxSizing: "border-box",
      }}
    >
      <Header chart={chart} />
      <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
        {chart.sections.map((section, si) => {
          const rows = chunkBars(section.bars);
          return (
            <div
              key={si}
              data-pdf-section
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
            >
              {rows.map((row, ri) => (
                <LyricRow
                  key={ri}
                  section={section}
                  bars={row}
                  isFirstRow={ri === 0}
                  isLastRow={ri === rows.length - 1}
                  showLyrics={showLyrics}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CLASSIC VARIANT — like "David"                                     */
/* ------------------------------------------------------------------ */

const KEY_SIG: Record<string, { count: number; kind: "sharp" | "flat" }> = {
  C: { count: 0, kind: "sharp" },
  Am: { count: 0, kind: "sharp" },
  G: { count: 1, kind: "sharp" }, Em: { count: 1, kind: "sharp" },
  D: { count: 2, kind: "sharp" }, Bm: { count: 2, kind: "sharp" },
  A: { count: 3, kind: "sharp" }, "F#m": { count: 3, kind: "sharp" },
  E: { count: 4, kind: "sharp" }, "C#m": { count: 4, kind: "sharp" },
  B: { count: 5, kind: "sharp" }, "G#m": { count: 5, kind: "sharp" },
  "F#": { count: 6, kind: "sharp" }, "D#m": { count: 6, kind: "sharp" },
  F: { count: 1, kind: "flat" }, Dm: { count: 1, kind: "flat" },
  Bb: { count: 2, kind: "flat" }, Gm: { count: 2, kind: "flat" },
  Eb: { count: 3, kind: "flat" }, Cm: { count: 3, kind: "flat" },
  Ab: { count: 4, kind: "flat" }, Fm: { count: 4, kind: "flat" },
  Db: { count: 5, kind: "flat" }, Bbm: { count: 5, kind: "flat" },
  Gb: { count: 6, kind: "flat" }, Ebm: { count: 6, kind: "flat" },
};

// Staff positions (from top staff line at y=0, each step = half lineGap)
// Sharps order & positions: F#, C#, G#, D#, A#, E#, B#
const SHARP_POS = [0, 1.5, -0.5, 1, 2.5, 1, 2.5]; // in staff-lines from top
const FLAT_POS = [2, 0.5, 2.5, 1, 3, 1.5, 3.5];

function ClassicSystem({
  section,
  bars,
  isFirstRow,
  isLastRow,
  isFirstSystemOfSection,
  showClef,
  keyName,
  timeSig,
  beats,
  feelHint,
}: {
  section: NSection;
  bars: NBar[];
  isFirstRow: boolean;
  isLastRow: boolean;
  isFirstSystemOfSection: boolean;
  showClef: boolean;
  keyName: string;
  timeSig: string;
  beats: number;
  feelHint?: string;
}) {
  const LABEL_W = 78;
  const viewW = 1000;
  const viewH = 74;
  const lineGap = 7;
  const staffTop = 24;
  const staffH = lineGap * 4;
  const staffBottom = staffTop + staffH;

  // Prefix width (clef + key sig + time sig)
  const clefW = showClef ? 30 : 0;
  const sig = KEY_SIG[keyName] ?? { count: 0, kind: "sharp" as const };
  const sigW = showClef ? sig.count * 8 + (sig.count ? 6 : 0) : 0;
  const timeW = showClef ? 24 : 0;
  const prefixW = clefW + sigW + timeW + 8;
  const barsArea = viewW - prefixW - 8;
  const barW = barsArea / BARS_PER_ROW;

  return (
    <div style={{ display: "flex", alignItems: "stretch", gap: 8, breakInside: "avoid" }}>
      {/* Section label box */}
      <div
        style={{
          width: LABEL_W,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
        }}
      >
        {isFirstSystemOfSection ? (
          <div
            style={{
              borderTop: "1px solid #000",
              borderBottom: "1px solid #000",
              borderLeft: "1px solid #000",
              padding: "6px 8px",
              fontSize: 12,
              fontWeight: 700,
              fontFamily: SERIF,
              textAlign: "center",
              minWidth: 58,
              lineHeight: 1.15,
              whiteSpace: "pre-line",
            }}
          >
            {section.label}
          </div>
        ) : null}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* feel/tempo hint above the very first system */}
        {feelHint ? (
          <div
            style={{
              fontFamily: SERIF,
              fontStyle: "italic",
              fontSize: 12,
              marginBottom: 2,
              marginLeft: prefixW * (PAGE_W / viewW * 0.001) + 30,
            }}
          >
            {feelHint}
          </div>
        ) : null}

        {/* Bar numbers */}
        <div
          style={{
            position: "relative",
            height: 14,
            fontFamily: SERIF,
            fontSize: 10,
            fontStyle: "italic",
          }}
        >
          {bars.map((b, i) => {
            const leftPct = ((prefixW + i * barW) / viewW) * 100;
            return (
              <span
                key={i}
                style={{
                  position: "absolute",
                  left: `${leftPct}%`,
                  transform: "translateX(4px)",
                }}
              >
                {b.number}
              </span>
            );
          })}
        </div>

        {/* Chord names */}
        <div style={{ position: "relative", height: 22 }}>
          {bars.map((b, i) => {
            if (b.chords.length === 0) return null;
            const leftPct = ((prefixW + i * barW) / viewW) * 100;
            return (
              <span
                key={i}
                style={{
                  position: "absolute",
                  left: `${leftPct}%`,
                  transform: "translateX(4px)",
                  fontFamily: SERIF,
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {b.chords.join("  ")}
              </span>
            );
          })}
        </div>

        <svg
          viewBox={`0 0 ${viewW} ${viewH}`}
          width="100%"
          height={viewH}
          preserveAspectRatio="none"
          style={{ display: "block" }}
        >
          {/* 5 staff lines */}
          {Array.from({ length: 5 }).map((_, i) => (
            <line
              key={i}
              x1={0}
              x2={viewW}
              y1={staffTop + i * lineGap}
              y2={staffTop + i * lineGap}
              stroke="#000"
              strokeWidth={0.9}
            />
          ))}

          {/* Treble clef (unicode glyph, serif) */}
          {showClef && (
            <text
              x={4}
              y={staffBottom + 4}
              fontFamily={SERIF}
              fontSize={40}
              fill="#000"
            >
              𝄞
            </text>
          )}

          {/* Key signature */}
          {showClef &&
            Array.from({ length: sig.count }).map((_, i) => {
              const pos = sig.kind === "sharp" ? SHARP_POS[i] : FLAT_POS[i];
              const y = staffTop + pos * lineGap + 3;
              const x = clefW + i * 8;
              return (
                <text
                  key={i}
                  x={x}
                  y={y}
                  fontFamily={SERIF}
                  fontSize={16}
                  fill="#000"
                >
                  {sig.kind === "sharp" ? "♯" : "♭"}
                </text>
              );
            })}

          {/* Time signature */}
          {showClef && (
            <>
              <text
                x={clefW + sigW + 4}
                y={staffTop + lineGap * 2 + 1}
                fontFamily={SERIF}
                fontSize={16}
                fontWeight={700}
                fill="#000"
              >
                {timeSig.split("/")[0]}
              </text>
              <text
                x={clefW + sigW + 4}
                y={staffBottom + 1}
                fontFamily={SERIF}
                fontSize={16}
                fontWeight={700}
                fill="#000"
              >
                {timeSig.split("/")[1] ?? "4"}
              </text>
            </>
          )}

          {/* Repeat start on first bar of first row of section */}
          {isFirstSystemOfSection && (
            <g>
              <line
                x1={prefixW - 1}
                x2={prefixW - 1}
                y1={staffTop}
                y2={staffBottom}
                stroke="#000"
                strokeWidth={2.5}
              />
              <line
                x1={prefixW + 3}
                x2={prefixW + 3}
                y1={staffTop}
                y2={staffBottom}
                stroke="#000"
                strokeWidth={0.8}
              />
              <circle cx={prefixW + 8} cy={staffTop + lineGap * 1.5} r={1.6} fill="#000" />
              <circle cx={prefixW + 8} cy={staffTop + lineGap * 2.5} r={1.6} fill="#000" />
            </g>
          )}

          {/* Barlines */}
          {bars.map((_, i) => {
            const x = prefixW + (i + 1) * barW;
            const isEnd = i === bars.length - 1 && isLastRow;
            return (
              <g key={i}>
                <line
                  x1={x}
                  x2={x}
                  y1={staffTop}
                  y2={staffBottom}
                  stroke="#000"
                  strokeWidth={isEnd ? 2 : 1}
                />
                {isEnd && (
                  <>
                    <line
                      x1={x - 4}
                      x2={x - 4}
                      y1={staffTop}
                      y2={staffBottom}
                      stroke="#000"
                      strokeWidth={0.8}
                    />
                    <circle cx={x - 9} cy={staffTop + lineGap * 1.5} r={1.6} fill="#000" />
                    <circle cx={x - 9} cy={staffTop + lineGap * 2.5} r={1.6} fill="#000" />
                  </>
                )}
              </g>
            );
          })}

          {/* Slash marks per beat */}
          {bars.map((b, i) => {
            const x0 = prefixW + i * barW;
            if (b.slashPattern === "simile") {
              const cx = x0 + barW / 2;
              const cy = staffTop + lineGap * 2;
              return (
                <g key={i}>
                  <line
                    x1={cx - 10}
                    y1={cy + 8}
                    x2={cx + 10}
                    y2={cy - 8}
                    stroke="#000"
                    strokeWidth={2.2}
                  />
                  <circle cx={cx - 6} cy={cy - 6} r={1.6} fill="#000" />
                  <circle cx={cx + 6} cy={cy + 6} r={1.6} fill="#000" />
                </g>
              );
            }
            if (b.slashPattern === "rest") {
              return (
                <rect
                  key={i}
                  x={x0 + barW / 2 - 6}
                  y={staffTop + lineGap - 1}
                  width={12}
                  height={4}
                  fill="#000"
                />
              );
            }
            const beatW = barW / beats;
            return (
              <g key={i}>
                {Array.from({ length: beats }).map((_, bi) => {
                  const cx = x0 + beatW * (bi + 0.5);
                  return (
                    <line
                      key={bi}
                      x1={cx - 5}
                      y1={staffTop + lineGap * 3}
                      x2={cx + 5}
                      y2={staffTop + lineGap * 1}
                      stroke="#000"
                      strokeWidth={1.8}
                    />
                  );
                })}
              </g>
            );
          })}

          {/* End marker for repeat count */}
          {isLastRow && section.repeat && section.repeat > 1 && (
            <text
              x={viewW - 4}
              y={staffTop - 4}
              fontFamily={SERIF}
              fontSize={13}
              fontWeight={700}
              textAnchor="end"
              fill="#000"
            >
              ×{section.repeat}
            </text>
          )}
        </svg>

        {/* Notes / lyrics per section (last row only) */}
        {isLastRow && section.notes ? (
          <div
            style={{
              marginTop: 4,
              fontFamily: SERIF,
              fontStyle: "italic",
              fontSize: 12,
              paddingLeft: 8,
            }}
          >
            {section.notes}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ClassicSheet({ chart }: { chart: NChart }) {
  const beats = parseInt(chart.timeSig.split("/")[0] ?? "4", 10) || 4;
  let systemIndex = 0;

  return (
    <div
      style={{
        width: PAGE_W,
        padding: "44px 48px 40px",
        background: "#fff",
        color: "#000",
        fontFamily: SERIF,
        boxSizing: "border-box",
      }}
    >
      <Header chart={chart} />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {chart.sections.map((section, si) => {
          const rows = chunkBars(section.bars);
          return (
            <div
              key={si}
              data-pdf-section
              style={{ display: "flex", flexDirection: "column", gap: 10 }}
            >
              {rows.map((row, ri) => {
                const isFirstOfSection = ri === 0;
                const showClef = true; // every system, like David
                const feelHint = systemIndex === 0 ? "Swing 16th" : undefined;
                systemIndex += 1;
                return (
                  <ClassicSystem
                    key={ri}
                    section={section}
                    bars={row}
                    isFirstRow={ri === 0}
                    isLastRow={ri === rows.length - 1}
                    isFirstSystemOfSection={isFirstOfSection}
                    showClef={showClef}
                    keyName={chart.key}
                    timeSig={chart.timeSig}
                    beats={beats}
                    feelHint={feelHint && si === 0 && ri === 0 ? feelHint : undefined}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Entry                                                              */
/* ------------------------------------------------------------------ */

export function LeadSheetChart({ song, semitones, showLyrics, variant = "lyric" }: Props) {
  const chart = normalize(song, semitones);
  if (variant === "classic") return <ClassicSheet chart={chart} />;
  return <LyricSheet chart={chart} showLyrics={showLyrics} />;
}
