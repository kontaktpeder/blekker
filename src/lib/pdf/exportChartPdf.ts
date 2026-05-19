import { createRoot } from "react-dom/client";
import { createElement } from "react";
import { PrintableChart } from "@/components/chart/PrintableChart";
import { transposeKey, type Song } from "@/lib/music";

interface ExportOptions {
  song: Song;
  semitones: number;
  showLyrics: boolean;
  orientation?: "portrait" | "landscape";
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export function buildFilename(song: Song, semitones: number): string {
  const key = transposeKey(song.key, semitones);
  const parts = [song.artist, song.title, key].filter(Boolean).map(slugify);
  return `${parts.join("-")}.pdf`;
}

export async function exportChartPdf({
  song,
  semitones,
  showLyrics,
  orientation = "portrait",
}: ExportOptions): Promise<void> {
  // Mount printable in an offscreen container so html2canvas can capture it
  // at a fixed A4 width regardless of viewport.
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.top = "0";
  host.style.background = "#ffffff";
  document.body.appendChild(host);

  const root = createRoot(host);

  try {
    await new Promise<void>((resolve) => {
      root.render(
        createElement(PrintableChart, { song, semitones, showLyrics }),
      );
      // Give layout/fonts a tick to settle.
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    const target = host.firstElementChild as HTMLElement | null;
    if (!target) throw new Error("Failed to render printable chart");

    const html2pdf = (await import("html2pdf.js")).default;

    const opts = {
      margin: [10, 10, 12, 10],
      filename: buildFilename(song, semitones),
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        windowWidth: 794,
      },
      jsPDF: { unit: "mm", format: "a4", orientation },
      pagebreak: { mode: ["css", "avoid-all"] },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (html2pdf() as any).from(target).set(opts).save();
  } finally {
    // Defer unmount to next tick to avoid React warning.
    setTimeout(() => {
      root.unmount();
      host.remove();
    }, 0);
  }
}
