import { transposeChord, transposeKey, type Song, type SectionType } from "@/lib/music";

// Print-safe hex palette (html2canvas can't parse oklch()).
const PRINT_SECTION_COLOR: Record<SectionType, string> = {
  intro: "#6b7280",
  verse: "#2563eb",
  chorus: "#dc2626",
  bridge: "#9333ea",
  outro: "#0f172a",
  interlude: "#6b7280",
  solo: "#9333ea",
};

interface Props {
  song: Song;
  semitones: number;
  showLyrics: boolean;
}

/**
 * Print-friendly A4 layout. Renders pure HTML/inline-styles so html2canvas
 * captures it consistently without depending on app theme tokens.
 */
export function PrintableChart({ song, semitones, showLyrics }: Props) {
  const displayKey = transposeKey(song.key, semitones);

  return (
    <div
      className="printable-chart"
      style={{
        width: "794px", // A4 @ 96dpi portrait
        padding: "40px 44px",
        background: "#ffffff",
        color: "#0a0a0a",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        fontSize: "12px",
        lineHeight: 1.45,
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <header
        style={{
          borderBottom: "2px solid #0a0a0a",
          paddingBottom: 14,
          marginBottom: 18,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 24,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              margin: 0,
              letterSpacing: "-0.01em",
            }}
          >
            {song.title}
          </h1>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#555",
            }}
          >
            {song.artist}
          </p>
        </div>
        <div
          style={{
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 11,
            display: "flex",
            gap: 18,
            whiteSpace: "nowrap",
          }}
        >
          <Meta label="KEY" value={displayKey} />
          <Meta label="BPM" value={String(song.bpm)} />
          <Meta label="CAPO" value={song.capo ? String(song.capo) : "—"} />
          {song.timeSig && <Meta label="TIME" value={song.timeSig} />}
        </div>
      </header>

      {/* Form */}
      {song.form.length > 0 && (
        <section style={{ marginBottom: 18 }}>
          <p
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 9,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#777",
              margin: "0 0 6px",
            }}
          >
            Form
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {song.form.map((f, i) => (
              <span
                key={i}
                style={{
                  border: "1px solid #d4d4d4",
                  borderRadius: 4,
                  padding: "3px 8px",
                  fontSize: 10,
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, monospace",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                {f}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Sections */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {song.sections.map((s) => {
          const color = PRINT_SECTION_COLOR[s.type];
          return (
            <section
              key={s.id}
              className="print-section"
              style={{
                border: "1px solid #e5e5e5",
                borderLeft: `4px solid ${color}`,
                borderRadius: 6,
                padding: "10px 14px",
                pageBreakInside: "avoid",
                breakInside: "avoid",
                background: "#fff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 10,
                  }}
                >
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 14,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color,
                    }}
                  >
                    {s.name}
                  </h2>
                  {s.repeat && s.repeat > 1 && (
                    <span
                      style={{
                        fontFamily:
                          "ui-monospace, SFMono-Regular, Menlo, monospace",
                        fontSize: 10,
                        color: "#666",
                      }}
                    >
                      ×{s.repeat}
                    </span>
                  )}
                </div>
                <span
                  style={{
                    fontFamily:
                      "ui-monospace, SFMono-Regular, Menlo, monospace",
                    fontSize: 10,
                    color: "#666",
                  }}
                >
                  {s.bars} bars
                </span>
              </div>

              {/* Chord grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 6,
                }}
              >
                {s.chords.map((c, i) => {
                  const isRest = c === "%" || c === "-";
                  return (
                    <div
                      key={i}
                      style={{
                        border: "1px solid #d4d4d4",
                        borderRadius: 4,
                        padding: "8px 4px",
                        textAlign: "center",
                        fontFamily:
                          "ui-monospace, SFMono-Regular, Menlo, monospace",
                        fontWeight: 600,
                        fontSize: 14,
                        color: isRest ? "#999" : "#0a0a0a",
                        background: "#fafafa",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
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
                    fontSize: 11,
                    color: "#1a1a1a",
                    lineHeight: 1.5,
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
                    fontSize: 10,
                    fontStyle: "italic",
                    color: "#666",
                  }}
                >
                  <span
                    style={{
                      fontFamily:
                        "ui-monospace, SFMono-Regular, Menlo, monospace",
                      fontStyle: "normal",
                      textTransform: "uppercase",
                      letterSpacing: "0.15em",
                      fontSize: 9,
                      marginRight: 6,
                      color: "#999",
                    }}
                  >
                    Note
                  </span>
                  {s.notes}
                </p>
              )}
            </section>
          );
        })}
      </div>

      <footer
        style={{
          marginTop: 24,
          paddingTop: 10,
          borderTop: "1px solid #e5e5e5",
          fontSize: 9,
          color: "#999",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          textAlign: "center",
        }}
      >
        Blekker · {song.artist} — {song.title} · {displayKey}
      </footer>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
      <span style={{ fontSize: 8, color: "#999", letterSpacing: "0.2em" }}>
        {label}
      </span>
      <span style={{ marginTop: 2, fontWeight: 600, fontSize: 12 }}>
        {value}
      </span>
    </div>
  );
}
