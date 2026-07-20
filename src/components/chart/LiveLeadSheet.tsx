import { useMemo } from "react";
import type { Song } from "@/lib/music";
import { normalizeSong } from "@/lib/engraving/normalize";
import {
  DENSITY_PRESETS,
  layoutContinuousLeadSheet,
  PAGE,
} from "@/lib/engraving/paginate";
import { LeadSheetSvg } from "@/lib/engraving/renderer/LeadSheetSvg";
import { KEY_ACCIDENTALS } from "@/lib/engraving/renderer/glyphs";
import { LIVE_LEAD_MAX_WIDTH_PX } from "@/lib/engraving/renderer/theme";

interface Props {
  song: Song;
  semitones: number;
  showLyrics: boolean;
}

/** No left section column — clef + key + time only (matches stageLayout). */
const CLEF_W = 84;
const TIMESIG_W = 56;
const KEYSIG_STEP = 20;

function systemContentWidth(keyName: string): number {
  const kw = (KEY_ACCIDENTALS[keyName]?.count ?? 0) * KEYSIG_STEP;
  const prefix = CLEF_W + kw + TIMESIG_W;
  return PAGE.width - PAGE.stageMarginX * 2 - prefix;
}

/** Stage density: fewer bars per system so chords stay large. */
const STAGE_DENSITY = {
  ...DENSITY_PRESETS[0],
  id: "stage",
  systemGap: 72,
  heightScale: 1.05,
  lyricGapScale: 1,
  maxMeasuresPerSystem: 4,
  headerHeight: 200,
  marginTop: 72,
};

/** Dark continuous lead sheet — full-width music, labels above, large type. */
export function LiveLeadSheet({ song, semitones, showLyrics }: Props) {
  const { score, pages, density, pageHeight } = useMemo(() => {
    const normalized = normalizeSong(song, semitones);
    const fitted = layoutContinuousLeadSheet(
      normalized,
      systemContentWidth(normalized.header.key),
      STAGE_DENSITY,
      { stage: true },
    );
    return {
      score: normalized,
      pages: fitted.pages,
      density: fitted.density,
      pageHeight: fitted.pageHeight,
    };
  }, [song, semitones]);

  return (
    <div
      className="mx-auto w-full overflow-hidden rounded-sm shadow-[0_0_0_1px_rgba(240,238,230,0.08)]"
      style={{ maxWidth: LIVE_LEAD_MAX_WIDTH_PX }}
    >
      <LeadSheetSvg
        score={score}
        pages={pages}
        showLyrics={showLyrics}
        density={density}
        theme="stage"
        pageHeights={[pageHeight]}
        continuous
        stageLayout
      />
    </div>
  );
}
