import { useMemo } from "react";
import type { Song } from "@/lib/music";
import { normalizeSong } from "@/lib/engraving/normalize";
import { layoutScore } from "@/lib/engraving/layout";
import { paginate, PAGE } from "@/lib/engraving/paginate";
import { LeadSheetSvg } from "@/lib/engraving/renderer/LeadSheetSvg";
import { KEY_ACCIDENTALS } from "@/lib/engraving/renderer/glyphs";

interface Props {
  song: Song;
  semitones: number;
  showLyrics: boolean;
}

// Mirror the renderer prefix so measure justification aligns with the drawn staff.
const LABEL_W = 180;
const CLEF_W = 90;
const TIMESIG_W = 70;
const KEYSIG_STEP = 20;

function systemContentWidth(keyName: string): number {
  const kw = (KEY_ACCIDENTALS[keyName]?.count ?? 0) * KEYSIG_STEP;
  const prefix = LABEL_W + CLEF_W + kw + TIMESIG_W;
  return PAGE.width - PAGE.marginX * 2 - prefix;
}

export function LeadSheetChart({ song, semitones, showLyrics }: Props) {
  const { score, pages } = useMemo(() => {
    const normalized = normalizeSong(song, semitones);
    const systems = layoutScore(normalized, {
      systemContentWidth: systemContentWidth(normalized.header.key),
      maxMeasuresPerSystem: 6,
    });
    return { score: normalized, pages: paginate(normalized, systems) };
  }, [song, semitones]);

  return <LeadSheetSvg score={score} pages={pages} showLyrics={showLyrics} />;
}
