import type { ComponentType } from "react";
import type { Song } from "@/lib/music";

export type ExportLayout = "blekker" | "lead-sheet";
export type ExportFormat = "pdf" | "sheet";

/** Sub-style within Lead Sheet. Other layouts ignore this. */
export type LeadSheetVariant = "lyric" | "classic";

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
  /** Whether this layout supports the `variant` prop. */
  variants?: { id: LeadSheetVariant; label: string; description: string }[];
}
