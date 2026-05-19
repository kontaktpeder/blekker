import { transposeChord, transposeKey, type Song } from "@/lib/music";

interface Props {
  song: Song;
  semitones: number;
  showLyrics: boolean;
}

/**
 * Print-friendly A4 layout. Pure inline styles, black & white only.
 * Each section is tagged with data-pdf-section so the exporter can paginate
 * cleanly without splitting sections across pages.
 */
export function PrintableChart({ song, semitones, showLyrics }: Props) {
  const displayKey = transposeKey(song.key, semitones);

  return (
    <div
      className="printable-chart"
      style={{
        width: "794px",
        padding: "28px 32px",
        background: "#ffffff",
        color: "#000000",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        fontSize: "11px",
        lineHeight: 1.35,
        boxSizing: "border-box",
      }}
    >
      <header
        data-pdf-section
        style={{
          borderBottom: "1.5px solid #000",
          paddingBottom: 8,
          marginBottom: 10,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 20,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>
            {song.title}
          </h1>
          <p
            style={{
              margin: "2px 0 0",
              fontSize: 10,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#000",
            }}
          >
            {song.artist}
          </p>
        </div>
        <div
          style={{
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 10,
            display: "flex",
            gap: 14,
            whiteSpace: "nowrap",
          }}
        >
          <Meta label="KEY" value={displayKey} />
          <Meta label="BPM" value={String(song.bpm)} />
          <Meta label="CAPO" value={song.capo ? String(song.capo) : "—"} />
          {song.timeSig && <Meta label="TIME" value={song.timeSig} />}
        </div>
      </header>

      {song.form.length > 0 && (
        <section data-pdf-section style={{ marginBottom: 10 }}>
          <p
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 8,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#000",
              margin: "0 0 4px",
            }}
          >
            Form
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {song.form.map((f, i) => (
              <span
                key={i}
                style={{
                  border: "1px solid #000",
                  borderRadius: 3,
                  padding: "2px 6px",
                  fontSize: 9,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                {f}
              </span>
            ))}
          </div>
        </section>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {song.sections.map((s) => (
          <section
            key={s.id}
            data-pdf-section
            style={{
              border: "1px solid #000",
              borderRadius: 4,
              padding: "8px 10px",
              background: "#fff",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: 10,
                marginBottom: 6,
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "#000",
                  }}
                >
                  {s.name}
                </h2>
                {s.repeat && s.repeat > 1 && (
                  <span
                    style={{
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                      fontSize: 9,
                      color: "#000",
                    }}
                  >
                    ×{s.repeat}
                  </span>
                )}
              </div>
              <span
                style={{
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  fontSize: 9,
                  color: "#000",
                }}
              >
                {s.bars} bars
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${Math.min(s.chords.length, 4)}, 1fr)`,
                gap: 4,
              }}
            >
              {s.chords.map((c, i) => {
                const isRest = c === "%" || c === "-";
                return (
                  <div
                    key={i}
                    style={{
                      border: "1px solid #000",
                      borderRadius: 3,
                      padding: "5px 4px",
                      textAlign: "center",
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                      fontWeight: 600,
                      fontSize: 12,
                      color: isRest ? "#666" : "#000",
                      background: "#fff",
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
                  marginTop: 6,
                  marginBottom: 0,
                  whiteSpace: "pre-line",
                  fontSize: 10,
                  color: "#000",
                  lineHeight: 1.35,
                }}
              >
                {s.lyrics}
              </p>
            )}

            {s.notes && (
              <p
                style={{
                  marginTop: 5,
                  marginBottom: 0,
                  fontSize: 9,
                  fontStyle: "italic",
                  color: "#000",
                }}
              >
                <span
                  style={{
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                    fontStyle: "normal",
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    fontSize: 8,
                    marginRight: 5,
                  }}
                >
                  Note
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
    <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
      <span style={{ fontSize: 7, color: "#000", letterSpacing: "0.2em" }}>{label}</span>
      <span style={{ marginTop: 1, fontWeight: 700, fontSize: 11 }}>{value}</span>
    </div>
  );
}
