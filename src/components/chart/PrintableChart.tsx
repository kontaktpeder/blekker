import { transposeChord, transposeKey, type Song } from "@/lib/music";
import { resolvePlayOrder } from "@/lib/ug-form";
import { displayBandNotes } from "@/lib/band-notes-no";

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
  const { form, sections } = resolvePlayOrder(song);

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

        {form.length > 0 && (
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
            {form.map((f, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 700 }}>{f}</span>
                {i < form.length - 1 && <span style={{ opacity: 0.5 }}>›</span>}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* SECTIONS — flat rows, no cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {sections.map((s, idx) => (
          <section
            key={s.id}
            data-pdf-section
            style={{
              paddingBottom: 12,
              borderBottom:
                idx < sections.length - 1 ? "1px solid #000" : "none",
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

            {/* Bars — chord above, slash line below (same structure as lead sheet) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 0,
                border: "1.5px solid #000",
              }}
            >
              {(s.chords.length > 0
                ? s.chords
                : Array.from({ length: Math.max(1, s.bars) }, () => "-")
              ).map((raw, i) => {
                const c = transposeChord(raw, semitones);
                const isSimile = raw === "%";
                const isRest = raw === "-" || raw === "";
                const cols = 4;
                const col = i % cols;
                const row = Math.floor(i / cols);
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      borderRight: col < cols - 1 ? "1px solid #000" : "none",
                      borderTop: row > 0 ? "1px solid #000" : "none",
                      minHeight: 56,
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "flex-end",
                        justifyContent: "flex-start",
                        padding: "10px 8px 6px",
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                        fontWeight: 700,
                        fontSize: 20,
                        color: isSimile || isRest ? "#555" : "#000",
                        lineHeight: 1,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {isRest ? "—" : c}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-around",
                        height: 28,
                        borderTop: "1px solid #000",
                        padding: "0 6px",
                      }}
                      aria-hidden
                    >
                      {isSimile ? (
                        <span
                          style={{
                            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                            fontSize: 18,
                            color: "#555",
                          }}
                        >
                          %
                        </span>
                      ) : isRest ? (
                        <span
                          style={{
                            width: 18,
                            height: 6,
                            borderRadius: 2,
                            background: "#888",
                          }}
                        />
                      ) : (
                        [0, 1, 2, 3].map((b) => (
                          <span
                            key={b}
                            style={{
                              display: "inline-block",
                              width: 2.5,
                              height: 14,
                              borderRadius: 999,
                              background: "#111",
                              transform: "rotate(28deg)",
                            }}
                          />
                        ))
                      )}
                    </div>
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
                {displayBandNotes(s.notes, semitones)}
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
