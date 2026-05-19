import { transposeChord, transposeKey, type Song } from "@/lib/music";

interface Props {
  song: Song;
  semitones: number;
  showLyrics: boolean;
}

/**
 * Print-friendly A4 layout. Pure black & white, no card chrome.
 * Fills the page edge-to-edge, large legible typography, scannable rows.
 * Each section is tagged with data-pdf-section so the exporter can paginate
 * without splitting sections.
 */
export function PrintableChart({ song, semitones, showLyrics }: Props) {
  const displayKey = transposeKey(song.key, semitones);

  return (
    <div
      className="printable-chart"
      style={{
        width: "794px",
        padding: "36px 40px",
        background: "#ffffff",
        color: "#000000",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        fontSize: "14px",
        lineHeight: 1.4,
        boxSizing: "border-box",
      }}
    >
      {/* HEADER */}
      <header
        data-pdf-section
        style={{
          borderBottom: "2px solid #000",
          paddingBottom: 14,
          marginBottom: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 24,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h1
              style={{
                fontSize: 34,
                fontWeight: 800,
                margin: 0,
                letterSpacing: "-0.02em",
                lineHeight: 1.05,
              }}
            >
              {song.title}
            </h1>
            <p
              style={{
                margin: "6px 0 0",
                fontSize: 14,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              {song.artist}
            </p>
          </div>
          <div
            style={{
              display: "flex",
              gap: 22,
              whiteSpace: "nowrap",
            }}
          >
            <Meta label="KEY" value={displayKey} />
            <Meta label="BPM" value={String(song.bpm)} />
            <Meta label="CAPO" value={song.capo ? String(song.capo) : "—"} />
            {song.timeSig && <Meta label="TIME" value={song.timeSig} />}
          </div>
        </div>

        {song.form.length > 0 && (
          <div
            style={{
              marginTop: 14,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 8,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 13,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            <span style={{ fontSize: 11, opacity: 0.7 }}>FORM</span>
            {song.form.map((f, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 700 }}>{f}</span>
                {i < song.form.length - 1 && <span style={{ opacity: 0.5 }}>›</span>}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* SECTIONS — flat rows, no cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {song.sections.map((s, idx) => (
          <section
            key={s.id}
            data-pdf-section
            style={{
              paddingBottom: 12,
              borderBottom:
                idx < song.sections.length - 1 ? "1px solid #000" : "none",
            }}
          >
            {/* Section header row */}
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 20,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {s.name}
                </h2>
                {s.repeat && s.repeat > 1 && (
                  <span
                    style={{
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                      fontSize: 15,
                      fontWeight: 700,
                    }}
                  >
                    ×{s.repeat}
                  </span>
                )}
              </div>
              <span
                style={{
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: "0.14em",
                }}
              >
                {s.bars} BARS
              </span>
            </div>

            {/* Chords — big and scannable, full-width grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${Math.min(
                  Math.max(s.chords.length, 1),
                  4,
                )}, 1fr)`,
                gap: 0,
                border: "1.5px solid #000",
              }}
            >
              {s.chords.map((c, i) => {
                const isRest = c === "%" || c === "-";
                const col = i % 4;
                const row = Math.floor(i / 4);
                const totalRows = Math.ceil(s.chords.length / Math.min(s.chords.length, 4));
                return (
                  <div
                    key={i}
                    style={{
                      borderRight: col < 3 && i < s.chords.length - 1 ? "1px solid #000" : "none",
                      borderTop: row > 0 ? "1px solid #000" : "none",
                      padding: "14px 8px",
                      textAlign: "center",
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                      fontWeight: 700,
                      fontSize: 22,
                      color: isRest ? "#555" : "#000",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      lineHeight: 1,
                      // ensure last row cells without right border don't look broken
                      ...(totalRows > 1 && row === totalRows - 1 && col === (s.chords.length - 1) % 4
                        ? {}
                        : {}),
                    }}
                  >
                    {transposeChord(c, semitones)}
                  </div>
                );
              })}
            </div>

            {showLyrics && s.lyrics && (
              <p
                style={{
                  marginTop: 10,
                  marginBottom: 0,
                  whiteSpace: "pre-line",
                  fontSize: 14,
                  lineHeight: 1.45,
                }}
              >
                {s.lyrics}
              </p>
            )}

            {s.notes && (
              <p
                style={{
                  marginTop: 8,
                  marginBottom: 0,
                  fontSize: 13,
                  fontStyle: "italic",
                }}
              >
                <span
                  style={{
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                    fontStyle: "normal",
                    textTransform: "uppercase",
                    letterSpacing: "0.16em",
                    fontSize: 11,
                    fontWeight: 700,
                    marginRight: 8,
                  }}
                >
                  NOTE
                </span>
                {s.notes}
              </p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.05 }}>
      <span
        style={{
          fontSize: 10,
          letterSpacing: "0.22em",
          fontWeight: 600,
        }}
      >
        {label}
      </span>
      <span
        style={{
          marginTop: 3,
          fontWeight: 800,
          fontSize: 20,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        }}
      >
        {value}
      </span>
    </div>
  );
}
