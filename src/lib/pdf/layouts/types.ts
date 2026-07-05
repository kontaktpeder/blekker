import type { ComponentType } from "react";
import type { Song } from "@/lib/music";

export type ExportLayout = "blekker" | "lead-sheet";
export type ExportFormat = "pdf" | "sheet";

export interface LayoutProps {
  song: Song;
  semitones: number;
  showLyrics: boolean;
}

export interface LayoutDefinition {
  id: ExportLayout;
  label: string;
  description: string;
  Component: ComponentType<LayoutProps>;
}
