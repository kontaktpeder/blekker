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
  const parts = [song.title, song.artist].filter(Boolean).map(slugify);
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

    // Pack sections into pages (max 2 pages target, overflow allowed).
    const MAX_PAGES = 2;
    const pages: { dataUrl: string; heightMM: number }[][] = [[]];
    let pageH = 0;
    for (const r of rendered) {
      const projected = pageH + (pages[pages.length - 1].length > 0 ? GAP_MM : 0) + r.heightMM;
      if (projected > CONTENT_H_MM && pages[pages.length - 1].length > 0 && pages.length < MAX_PAGES) {
        pages.push([r]);
        pageH = r.heightMM;
      } else {
        pages[pages.length - 1].push(r);
        pageH = projected;
      }
    }

    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

    pages.forEach((sections, pageIdx) => {
      if (pageIdx > 0) pdf.addPage();
      const totalSecH = sections.reduce((s, x) => s + x.heightMM, 0);
      const gaps = sections.length - 1;
      // Distribute remaining vertical space as larger gaps to fill the page.
      const remaining = CONTENT_H_MM - totalSecH;
      const gap = gaps > 0 ? Math.max(GAP_MM, Math.min(remaining / gaps, 40)) : 0;
      let y = MARGIN_MM;
      for (const r of sections) {
        pdf.addImage(r.dataUrl, "JPEG", MARGIN_MM, y, CONTENT_W_MM, r.heightMM);
        y += r.heightMM + gap;
      }
    });

    pdf.save(buildFilename(song, semitones));
  } finally {
    setTimeout(() => {
      root.unmount();
      host.remove();
    }, 0);
  }
}
