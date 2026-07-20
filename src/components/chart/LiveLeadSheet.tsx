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
import {
  LIVE_LEAD_MAX_WIDTH_PX,
  type ChartThemeId,
} from "@/lib/engraving/renderer/theme";

interface Props {
  song: Song;
  semitones: number;
  showLyrics: boolean;
  /** stage = dark; paper = light. Layout stays stage (full-width, labels above). */
  theme?: ChartThemeId;
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

/** Continuous lead sheet for Live — light or dark ink, same stage layout. */
export function LiveLeadSheet({
  song,
  semitones,
  showLyrics,
  theme = "stage",
}: Props) {
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

  const isLight = theme === "paper";

  return (
    <div
      className="mx-auto w-full rounded-sm"
      style={{
        maxWidth: LIVE_LEAD_MAX_WIDTH_PX,
        boxShadow: isLight
          ? "0 0 0 1px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)"
          : "0 0 0 1px rgba(240,238,230,0.08)",
      }}
    >
      <LeadSheetSvg
        score={score}
        pages={pages}
        showLyrics={showLyrics}
        density={density}
        theme={theme}
        pageHeights={[pageHeight]}
        continuous
        stageLayout
      />
    </div>
  );
}
