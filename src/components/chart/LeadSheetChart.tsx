import { transposeChord, transposeKey, type Section, type Song } from "@/lib/music";

interface Props {
  song: Song;
  semitones: number;
  showLyrics: boolean;
}

const BARS_PER_ROW = 4;
const SERIF = "Georgia, 'Times New Roman', Times, serif";

function beatsPerBar(timeSig?: string): number {
  if (!timeSig) return 4;
  const n = parseInt(timeSig.split("/")[0] ?? "4", 10);
  return Number.isFinite(n) && n > 0 ? n : 4;
}

interface SystemRow {
  startBar: number; // absolute bar number in section
  chords: string[];
}

function toRows(section: Section): SystemRow[] {
  const rows: SystemRow[] = [];
  for (let i = 0; i < section.chords.length; i += BARS_PER_ROW) {
    rows.push({
      startBar: i + 1,
      chords: section.chords.slice(i, i + BARS_PER_ROW),
    });
  }
  if (rows.length === 0) rows.push({ startBar: 1, chords: [] });
  return rows;
}

/**
 * Classic band-style lead sheet layout. Pure black & white, serif type,
 * section labels in bracketed boxes on the left, chord names above a
 * simplified 5-line staff with slash-mark rhythm per beat.
 *
 * This is an alternative *presentation* of the same Song data — the
 * exporter picks it from the layout registry.
 */
export function LeadSheetChart({ song, semitones, showLyrics }: Props) {
  const displayKey = transposeKey(song.key, semitones);
  const beats = beatsPerBar(song.timeSig);
  const timeSig = song.timeSig ?? "4/4";

  // Absolute bar counter across sections (like the reference sheet).
  let globalBar = 1;

  return (
    <div
      className="lead-sheet"
      style={{
        width: "794px",
        padding: "48px 56px",
        background: "#ffffff",
        color: "#000000",
        fontFamily: SERIF,
        fontSize: 14,
        lineHeight: 1.35,
        boxSizing: "border-box",
      }}
    >
      {/* HEADER — centered title, artist top-right, key/bpm bottom-right */}
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
            fontSize: 34,
            fontWeight: 400,
            letterSpacing: "0.01em",
          }}
        >
          {song.title}
        </h1>
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 12,
            fontSize: 13,
            fontStyle: "italic",
          }}
        >
          {song.artist}
        </div>
        <div
          style={{
            marginTop: 10,
            display: "flex",
            justifyContent: "center",
            gap: 18,
            fontSize: 12,
            fontStyle: "italic",
            color: "#000",
          }}
        >
          <span>Key: {displayKey}</span>
          <span>♩ = {song.bpm}</span>
          <span>{timeSig}</span>
          {song.capo ? <span>Capo {song.capo}</span> : null}
        </div>
      </header>

      {/* SECTIONS as systems */}
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        {song.sections.map((section) => {
          const rows = toRows(section);
          const sectionStartBar = globalBar;
          globalBar += section.chords.length || 1;
          return (
            <section
              key={section.id}
              data-pdf-section
              style={{ display: "flex", flexDirection: "column", gap: 10 }}
            >
              {rows.map((row, rIdx) => (
                <SystemRowView
                  key={rIdx}
                  section={section}
                  row={row}
                  semitones={semitones}
                  beats={beats}
                  isFirstRow={rIdx === 0}
                  isLastRow={rIdx === rows.length - 1}
                  absoluteStartBar={sectionStartBar + row.startBar - 1}
                />
              ))}

              {section.notes && (
                <p
                  style={{
                    margin: "2px 0 0 96px",
                    fontStyle: "italic",
                    fontSize: 12,
                  }}
                >
                  {section.notes}
                </p>
              )}

              {showLyrics && section.lyrics && (
                <p
                  style={{
                    margin: "2px 0 0 96px",
                    whiteSpace: "pre-line",
                    fontSize: 12,
                  }}
                >
                  {section.lyrics}
                </p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

interface RowViewProps {
  section: Section;
  row: SystemRow;
  semitones: number;
  beats: number;
  isFirstRow: boolean;
  isLastRow: boolean;
  absoluteStartBar: number;
}

function SystemRowView({
  section,
  row,
  semitones,
  beats,
  isFirstRow,
  isLastRow,
  absoluteStartBar,
}: RowViewProps) {
  const LABEL_W = 82;
  const STAFF_H = 44;
  const CHORDS_H = 22;
  const BARNUM_H = 14;

  return (
    <div style={{ display: "flex", alignItems: "stretch", gap: 8 }}>
      {/* Section label (only on first row) */}
      <div
        style={{
          width: LABEL_W,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          paddingRight: 6,
        }}
      >
        {isFirstRow ? (
          <div
            style={{
              borderTop: "1px solid #000",
              borderBottom: "1px solid #000",
              borderLeft: "1px solid #000",
              padding: "6px 10px",
              fontSize: 13,
              fontWeight: 700,
              textAlign: "center",
              minWidth: 62,
              letterSpacing: "0.02em",
              lineHeight: 1.15,
            }}
          >
            {section.name}
            {section.repeat && section.repeat > 1 && (
              <div style={{ fontSize: 11, fontStyle: "italic", marginTop: 2 }}>
                ×{section.repeat}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Bar numbers + chord names + staff */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Bar number strip */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${BARS_PER_ROW}, 1fr)`,
            height: BARNUM_H,
            fontSize: 10,
            fontStyle: "italic",
          }}
        >
          {Array.from({ length: BARS_PER_ROW }).map((_, i) =>
            i < row.chords.length ? (
              <div key={i} style={{ paddingLeft: 4 }}>
                {absoluteStartBar + i}
              </div>
            ) : (
              <div key={i} />
            ),
          )}
        </div>

        {/* Chord names */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${BARS_PER_ROW}, 1fr)`,
            height: CHORDS_H,
            fontFamily: SERIF,
            fontSize: 15,
            fontWeight: 700,
          }}
        >
          {Array.from({ length: BARS_PER_ROW }).map((_, i) => {
            const c = row.chords[i];
            if (c === undefined) return <div key={i} />;
            return (
              <div key={i} style={{ paddingLeft: 6 }}>
                {c === "%" || c === "-" ? "" : transposeChord(c, semitones)}
              </div>
            );
          })}
        </div>

        {/* Staff */}
        <StaffSvg
          bars={row.chords}
          beats={beats}
          height={STAFF_H}
          isLastRowOfSection={isLastRow}
          repeat={isLastRow ? section.repeat ?? 0 : 0}
        />
      </div>
    </div>
  );
}

function StaffSvg({
  bars,
  beats,
  height,
  isLastRowOfSection,
  repeat,
}: {
  bars: string[];
  beats: number;
  height: number;
  isLastRowOfSection: boolean;
  repeat: number;
}) {
  const viewW = 1000; // internal viewport, scales to container width
  const viewH = height;
  const lineGap = 6;
  const staffTop = (viewH - lineGap * 4) / 2;
  const barsInRow = BARS_PER_ROW;
  const barWidth = viewW / barsInRow;
  const usedBars = bars.length;

  return (
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
          strokeWidth={0.8}
        />
      ))}

      {/* Barlines */}
      {Array.from({ length: barsInRow + 1 }).map((_, i) => {
        const x = i * barWidth;
        // Only draw barlines for used bars (+ closing line after last used bar)
        if (i > usedBars) return null;
        const isEnd = i === usedBars && isLastRowOfSection;
        const isStart = i === 0;
        const w = isEnd || isStart ? 1.6 : 1;
        return (
          <line
            key={i}
            x1={x === 0 ? 0.5 : x === viewW ? viewW - 0.5 : x}
            x2={x === 0 ? 0.5 : x === viewW ? viewW - 0.5 : x}
            y1={staffTop}
            y2={staffTop + lineGap * 4}
            stroke="#000"
            strokeWidth={w}
          />
        );
      })}

      {/* Final repeat marker */}
      {isLastRowOfSection && repeat > 1 && (
        <text
          x={usedBars * barWidth - 8}
          y={staffTop - 4}
          fontSize={12}
          fontStyle="italic"
          textAnchor="end"
          fontFamily={SERIF}
        >
          ×{repeat}
        </text>
      )}

      {/* Slash marks per beat inside each used bar */}
      {bars.map((chord, bi) => {
        const x0 = bi * barWidth;
        const beatW = barWidth / beats;
        const isRest = chord === "-";
        const isSimile = chord === "%";
        if (isSimile) {
          // Draw simile / repeat-previous mark: a diagonal with two dots
          const cx = x0 + barWidth / 2;
          const cy = staffTop + lineGap * 2;
          return (
            <g key={bi}>
              <line
                x1={cx - 10}
                y1={cy + 8}
                x2={cx + 10}
                y2={cy - 8}
                stroke="#000"
                strokeWidth={2}
              />
              <circle cx={cx - 6} cy={cy - 6} r={1.6} fill="#000" />
              <circle cx={cx + 6} cy={cy + 6} r={1.6} fill="#000" />
            </g>
          );
        }
        if (isRest) {
          // Whole-rest style block hanging from the 4th line
          const y = staffTop + lineGap * 1;
          return (
            <rect
              key={bi}
              x={x0 + barWidth / 2 - 6}
              y={y}
              width={12}
              height={4}
              fill="#000"
            />
          );
        }
        // Slash marks per beat
        return (
          <g key={bi}>
            {Array.from({ length: beats }).map((_, b) => {
              const cx = x0 + beatW * (b + 0.5);
              const top = staffTop + lineGap * 1;
              const bot = staffTop + lineGap * 3;
              return (
                <line
                  key={b}
                  x1={cx - 5}
                  y1={bot}
                  x2={cx + 5}
                  y2={top}
                  stroke="#000"
                  strokeWidth={1.6}
                />
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
