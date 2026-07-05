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
    description: "Tradisjonell layout for utskrift og band.",
    Component: LeadSheetChart,
  },
};

export const LAYOUT_ORDER: ExportLayout[] = ["blekker", "lead-sheet"];

export type { ExportLayout, ExportFormat, LayoutDefinition, LayoutProps } from "./types";
