import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import type { Song } from "@/lib/music";
import {
  buildChartPdfBlob,
  type ExportOptions,
} from "@/lib/pdf/exportChartPdf";
import type { ExportLayout, LeadSheetVariant } from "@/lib/pdf/layouts";

export type SetlistExportBundle = "combined" | "zip";

function toFilenamePart(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\\/:*?"<>|]+/g, "")
    .trim()
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
    .slice(0, 80);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2_000);
}

export type SetlistExportOptions = {
  setlistName: string;
  songs: Song[];
  bundle: SetlistExportBundle;
  layout?: ExportLayout;
  variant?: LeadSheetVariant;
  showLyrics?: boolean;
  semitones?: number;
  onProgress?: (done: number, total: number, title: string) => void;
};

/**
 * Export every chart in a setlist as one combined PDF, or a ZIP of one PDF per song.
 */
export async function exportSetlistCharts({
  setlistName,
  songs,
  bundle,
  layout = "blekker",
  variant,
  showLyrics = true,
  semitones = 0,
  onProgress,
}: SetlistExportOptions): Promise<void> {
  if (songs.length === 0) throw new Error("Setlisten er tom");

  const files: { blob: Blob; filename: string }[] = [];
  for (let i = 0; i < songs.length; i++) {
    const song = songs[i];
    onProgress?.(i, songs.length, song.title);
    const opts: Omit<ExportOptions, "format"> = {
      song,
      semitones,
      showLyrics,
      layout,
      variant,
    };
    const built = await buildChartPdfBlob(opts);
    files.push(built);
  }
  onProgress?.(songs.length, songs.length, setlistName);

  const base = toFilenamePart(setlistName) || "Setlist";

  if (bundle === "combined") {
    const merged = await PDFDocument.create();
    for (const file of files) {
      const src = await PDFDocument.load(await file.blob.arrayBuffer());
      const pages = await merged.copyPages(src, src.getPageIndices());
      for (const page of pages) merged.addPage(page);
    }
    const bytes = await merged.save();
    const copy = new Uint8Array(bytes);
    triggerDownload(
      new Blob([copy], { type: "application/pdf" }),
      `${base}.pdf`,
    );
    return;
  }

  const zip = new JSZip();
  const used = new Map<string, number>();
  files.forEach((file, i) => {
    const n = String(i + 1).padStart(2, "0");
    let name = `${n}-${file.filename}`;
    const key = name.toLowerCase();
    const count = used.get(key) ?? 0;
    used.set(key, count + 1);
    if (count > 0) {
      name = name.replace(/\.pdf$/i, `-${count + 1}.pdf`);
    }
    zip.file(name, file.blob);
  });
  const zipBlob = await zip.generateAsync({ type: "blob" });
  triggerDownload(zipBlob, `${base}.zip`);
}
