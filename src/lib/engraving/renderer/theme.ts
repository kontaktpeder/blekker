/** Chart ink themes — paper PDF vs stage Live. */

export type ChartThemeId = "paper" | "stage";

export type ChartTheme = {
  id: ChartThemeId;
  page: string;
  ink: string;
  muted: string;
};

export const CHART_THEMES: Record<ChartThemeId, ChartTheme> = {
  paper: {
    id: "paper",
    page: "#ffffff",
    ink: "#000000",
    muted: "#444444",
  },
  stage: {
    id: "stage",
    page: "#0e0e10",
    ink: "#f0eee6",
    muted: "#9a968c",
  },
};

/** iPad portrait content width (px) — Live uses this on phone, tablet, and desktop. */
export const LIVE_LEAD_MAX_WIDTH_PX = 834;
