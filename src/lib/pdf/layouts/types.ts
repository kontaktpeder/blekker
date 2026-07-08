import type { ComponentType } from "react";
import type { Song } from "@/lib/music";

export type ExportLayout = "blekker" | "lead-sheet";
export type ExportFormat = "pdf" | "sheet";

/** Reserved for future sub-styles. Unused today. */
export type LeadSheetVariant = never;

export interface LayoutProps {
  song: Song;
  semitones: number;
  showLyrics: boolean;
  variant?: LeadSheetVariant;
}

export interface LayoutDefinition {
  id: ExportLayout;
  label: string;
  description: string;
  Component: ComponentType<LayoutProps>;
  variants?: { id: LeadSheetVariant; label: string; description: string }[];
}
