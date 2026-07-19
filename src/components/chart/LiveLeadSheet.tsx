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

const LABEL_W = 170;
const CLEF_W = 84;
const TIMESIG_W = 56;
const KEYSIG_STEP = 20;

function systemContentWidth(keyName: string): number {
  const kw = (KEY_ACCIDENTALS[keyName]?.count ?? 0) * KEYSIG_STEP;
  const prefix = LABEL_W + CLEF_W + kw + TIMESIG_W;
  return PAGE.width - PAGE.marginX * 2 - prefix;
}

/** Dark continuous lead sheet — iPad content width on all devices. */
export function LiveLeadSheet({ song, semitones, showLyrics }: Props) {
  const { score, pages, density, pageHeight } = useMemo(() => {
    const normalized = normalizeSong(song, semitones);
    // Roomy: readable on stage without A4 page packing.
    const fitted = layoutContinuousLeadSheet(
      normalized,
      systemContentWidth(normalized.header.key),
      DENSITY_PRESETS[1],
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
      />
    </div>
  );
}
