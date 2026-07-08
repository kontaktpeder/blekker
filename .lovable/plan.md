# Music Engraving Engine for Blekker Lead Sheets

Rebuild the Lead Sheet export as a proper 4-stage engraving pipeline instead of a styled React page. The Blekker Standard layout stays untouched.

## Architecture

```text
Song (app model)
   ↓  normalize
NormalizedScore { sections[] → measures[] → events[] }
   ↓  layout engine
Systems (grouped measures with widths, chord slots, lyric slots)
   ↓  paginator
Pages (systems packed into A4 with margins + header block)
   ↓  renderer (SVG only)
<svg> per page → html2canvas → jsPDF (existing engine)
```

Each stage is a pure function. The renderer draws; it never decides where things go.

## New file structure

```text
src/lib/engraving/
  model.ts           // NormalizedScore, Measure, MusicalEvent, Marker types
  normalize.ts       // Song → NormalizedScore (parses "%", "-", repeats, markers, N.C.)
  layout.ts          // measures → systems (density-based widths, section breaks)
  paginate.ts        // systems → pages (A4, header block, margins)
  renderer/
    LeadSheetSvg.tsx // renders one <svg> page: staff, clefs, chords, lyrics, labels
    glyphs.ts        // SVG paths for treble clef, sharp/flat, repeat dots, segno, coda, fermata
    typography.ts    // font sizes / spacing constants (engraving units)
```

Existing files:

- `src/components/chart/LeadSheetChart.tsx` → thin wrapper: normalize → layout → paginate → render one `<div data-pdf-section>` per page containing a full-A4 SVG.
- `src/lib/pdf/exportChartPdf.ts` → unchanged (already rasterizes SVG → PDF).
- `src/lib/pdf/layouts/index.ts` → drop the `classic`/`lyric` variants (one engraved output covers both references). Keep `variant` type as `undefined` for `lead-sheet` and remove the Stil section from `ExportDialog` when no variants exist (already conditional).
- `src/components/chart/PrintableChart.tsx` and Blekker Standard: untouched.

## Engraving rules implemented

**Header block** (top of first page)
- Title centered, large serif.
- Artist top-right, small caps.
- Below title: `Key · Tempo · Time · Feel` on one metadata line.

**Systems**
- 5-line staff, treble clef, key signature (sharps/flats drawn from a glyph table), time signature stacked numerals.
- Barlines between measures; final measure of song gets a thin+thick double barline; repeat sections get `:|` dots.
- Slash notation: one slash per beat (derived from time signature), simile `%` glyph for repeated measures, whole-measure rest for `-`.
- Measure numbers: small digits above the first measure of each system, plus every 4 bars.
- Rehearsal marks (Intro/Verse/Chorus…): boxed letter/name in the left margin of the system that starts a new section, aligned with the staff.

**Chords**
- Above the staff, positioned at beat X of their measure (not distributed equally across the bar). Multiple chords in a bar snap to beat slots.
- Serif chord font, slash bass rendered inline (`G/B`).
- `N.C.`, `Tacet`, `Break`, `Stop`, `Hits` rendered as chord-position text markers.

**Lyrics**
- Word-wrapped below the staff, syllables aligned to their measure's left edge (approximation — no melisma engine yet).
- Only rendered when `showLyrics` is on and section has lyrics.

**Markers / navigation**
- `D.C.`, `D.S.`, `Fine`, `To Coda`, `Coda`, `Segno`, `Fermata`, `x2`, `x4`, `Repeat` — placed above the target measure using proper glyphs where applicable (Segno/Coda are drawn SVG paths, the rest use italic serif text).

## Layout engine details

- Content width = A4 210mm − 2×15mm margins = 180mm. Convert to SVG viewBox units (1 unit ≈ 0.1mm).
- Per measure, compute an intrinsic width from: chord count (min slot per chord), lyric width estimate, plus a base slash-notation width scaled by beats-per-bar.
- Pack measures greedily into a system until the running width would exceed content width; justify by distributing leftover space proportionally to intrinsic widths (never equal).
- Force a system break at the start of a new section (Verse → Chorus, etc.) so rehearsal marks always lead a fresh line.
- Systems packed into pages with fixed vertical rhythm (system height = staff + chord row + lyric row + gap). Overflow flows onto page 2, then page 3… no hard 2-page cap for Lead Sheet.

## SVG renderer

- One `<svg viewBox="0 0 2100 2970">` per page (A4 in tenths of a mm) wrapped in `<div data-pdf-section>`.
- Glyphs: hand-authored SVG path data for treble clef, sharp, flat, natural, segno, coda, fermata, repeat dots. Barlines and staff lines are `<line>`. Chord and lyric text are `<text>` with a serif family stack (`Georgia, "Times New Roman", serif`).
- No colors — pure black on white. No rounded rectangles, no gradients, no shadows.

## Export dialog

- Remove the "Stil" variant selector (single engraved output now covers both references).
- Keep Format (PDF / Per Sheet) and Layout (Blekker / Lead Sheet).
- Per-Sheet mode emits one PNG per page (paginated output), not per section.

## Not in scope this pass

- No true stem/beam engraving (slashes only) — matches both references.
- No syllable-level lyric hyphenation.
- No transposition of key-signature accidentals rendering (we still transpose chord symbols; the drawn key signature reflects the transposed key).
- Nashville / Real Book variants — the engine supports them, but no additional renderers are shipped now.

## Verification

- Build/typecheck runs automatically.
- After the change, drive Playwright headless to open a song, trigger Lead Sheet export, save the PDF, rasterize via `pdftoppm`, and view the images to confirm: staff lines present, clef drawn, chord positions varied per bar, section labels in the margin, no card/gradient styling. Iterate until the output visually matches a Sibelius-style lead sheet.
