import { useMemo } from "react";
import type { Song } from "@/lib/music";
import { normalizeSong } from "@/lib/engraving/normalize";
import { fitLeadSheetPages, PAGE } from "@/lib/engraving/paginate";
import { LeadSheetSvg } from "@/lib/engraving/renderer/LeadSheetSvg";
import { KEY_ACCIDENTALS } from "@/lib/engraving/renderer/glyphs";

interface Props {
  song: Song;
  semitones: number;
  showLyrics: boolean;
}

// Mirror the renderer prefix so measure justification aligns with the drawn staff.
const LABEL_W = 170;
const CLEF_W = 84;
const TIMESIG_W = 56;
const KEYSIG_STEP = 20;

function systemContentWidth(keyName: string): number {
  const kw = (KEY_ACCIDENTALS[keyName]?.count ?? 0) * KEYSIG_STEP;
  const prefix = LABEL_W + CLEF_W + kw + TIMESIG_W;
  return PAGE.width - PAGE.marginX * 2 - prefix;
}

export function LeadSheetChart({ song, semitones, showLyrics }: Props) {
  const { score, pages, density } = useMemo(() => {
    const normalized = normalizeSong(song, semitones);
    const fitted = fitLeadSheetPages(
      normalized,
      systemContentWidth(normalized.header.key),
    );
    return {
      score: normalized,
      pages: fitted.pages,
      density: fitted.density,
    };
  }, [song, semitones]);

  return (
    <LeadSheetSvg
      score={score}
      pages={pages}
      showLyrics={showLyrics}
      density={density}
    />
  );
}
