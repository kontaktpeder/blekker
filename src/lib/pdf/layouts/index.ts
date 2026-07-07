import { PrintableChart } from "@/components/chart/PrintableChart";
import { LeadSheetChart } from "@/components/chart/LeadSheetChart";
import type { ExportLayout, LayoutDefinition } from "./types";

export const LAYOUTS: Record<ExportLayout, LayoutDefinition> = {
  blekker: {
    id: "blekker",
    label: "Blekker Standard",
    description: "Moderne layout optimalisert for øving.",
    Component: PrintableChart,
  },
  "lead-sheet": {
    id: "lead-sheet",
    label: "Lead Sheet",
    description: "Tradisjonelt bandark med notesystem.",
    Component: LeadSheetChart,
    variants: [
      {
        id: "lyric",
        label: "Lyric / Chord",
        description: "Én-linje slash-notation med tekst under, seksjonslabels med streker.",
      },
      {
        id: "classic",
        label: "Classic",
        description: "5-linjers notesystem, G-nøkkel, toneart, boksede seksjoner.",
      },
    ],
  },
};

export const LAYOUT_ORDER: ExportLayout[] = ["blekker", "lead-sheet"];

export type {
  ExportLayout,
  ExportFormat,
  LayoutDefinition,
  LayoutProps,
  LeadSheetVariant,
} from "./types";
