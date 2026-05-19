import { createRoot } from "react-dom/client";
import { createElement } from "react";
import { PrintableChart } from "@/components/chart/PrintableChart";
import { transposeKey, type Song } from "@/lib/music";

interface ExportOptions {
  song: Song;
  semitones: number;
  showLyrics: boolean;
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

const A4_W_MM = 210;
const A4_H_MM = 297;
const MARGIN_MM = 12;
const CONTENT_W_MM = A4_W_MM - MARGIN_MM * 2;
const CONTENT_H_MM = A4_H_MM - MARGIN_MM * 2;
const GAP_MM = 3;

export async function exportChartPdf({
  song,
  semitones,
  showLyrics,
}: ExportOptions): Promise<void> {
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.top = "0";
  host.style.background = "#ffffff";
  document.body.appendChild(host);

  const root = createRoot(host);

  try {
    await new Promise<void>((resolve) => {
      root.render(createElement(PrintableChart, { song, semitones, showLyrics }));
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    const container = host.firstElementChild as HTMLElement | null;
    if (!container) throw new Error("Failed to render printable chart");

    const sections = Array.from(
      container.querySelectorAll<HTMLElement>("[data-pdf-section]"),
    );
    if (sections.length === 0) throw new Error("No sections to export");

    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);

    // Render each section to an image, then paginate (max 2 pages target).
    const rendered: { dataUrl: string; heightMM: number }[] = [];
    for (const el of sections) {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        onclone: (doc) => {
          doc.querySelectorAll('style, link[rel="stylesheet"]').forEach((n) => n.remove());
          doc.documentElement.style.background = "#ffffff";
          doc.body.style.background = "#ffffff";
          doc.body.style.color = "#000000";
        },
      });
      const pxW = canvas.width / 2;
      const pxH = canvas.height / 2;
      const scale = CONTENT_W_MM / pxW;
      rendered.push({
        dataUrl: canvas.toDataURL("image/jpeg", 0.92),
        heightMM: pxH * scale,
      });
    }

    // Try to fit on 2 pages. If natural height exceeds, scale all sections down.
    const totalHeight =
      rendered.reduce((sum, r) => sum + r.heightMM, 0) +
      GAP_MM * (rendered.length - 1);
    const twoPageCapacity = CONTENT_H_MM * 2 - GAP_MM * (rendered.length - 1);
    const shrink = totalHeight > twoPageCapacity ? twoPageCapacity / totalHeight : 1;

    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    let y = MARGIN_MM;
    let pageIdx = 0;

    for (const r of rendered) {
      const h = r.heightMM * shrink;
      const w = CONTENT_W_MM * shrink;
      // If this section doesn't fit in remaining space, new page.
      if (y + h > A4_H_MM - MARGIN_MM && y > MARGIN_MM) {
        if (pageIdx < 1) {
          pdf.addPage();
          pageIdx++;
          y = MARGIN_MM;
        } else {
          // Already on last allowed page — keep going but allow overflow page.
          pdf.addPage();
          pageIdx++;
          y = MARGIN_MM;
        }
      }
      pdf.addImage(r.dataUrl, "JPEG", MARGIN_MM, y, w, h);
      y += h + GAP_MM;
    }

    pdf.save(buildFilename(song, semitones));
  } finally {
    setTimeout(() => {
      root.unmount();
      host.remove();
    }, 0);
  }
}
