import { createRoot } from "react-dom/client";
import { createElement } from "react";
import { type Song } from "@/lib/music";
import {
  LAYOUTS,
  type ExportLayout,
  type ExportFormat,
  type LeadSheetVariant,
} from "./layouts";

interface ExportOptions {
  song: Song;
  semitones: number;
  showLyrics: boolean;
  layout?: ExportLayout;
  format?: ExportFormat;
  variant?: LeadSheetVariant;
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

export function buildFilename(
  song: Song,
  layout: ExportLayout,
  ext: string,
): string {
  const parts = [song.title, song.artist].filter(Boolean).map(slugify);
  const base = parts.join("-") || "chart";
  const suffix = layout === "lead-sheet" ? "-leadsheet" : "";
  return `${base}${suffix}.${ext}`;
}

const A4_W_MM = 210;
const A4_H_MM = 297;
const MARGIN_MM = 12;
const CONTENT_W_MM = A4_W_MM - MARGIN_MM * 2;
const CONTENT_H_MM = A4_H_MM - MARGIN_MM * 2;
const GAP_MM = 3;

/**
 * Renders the chosen layout off-screen, snapshots each section with
 * html2canvas, and emits the requested file format. Layout is a
 * presentation choice — data and pagination logic stay the same.
 */
export async function exportChartPdf({
  song,
  semitones,
  showLyrics,
  layout = "blekker",
  format = "pdf",
  variant,
}: ExportOptions): Promise<void> {
  const LayoutComponent = LAYOUTS[layout].Component;

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
        createElement(LayoutComponent, { song, semitones, showLyrics, variant }),
      );
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    const container = host.firstElementChild as HTMLElement | null;
    if (!container) throw new Error("Failed to render printable chart");

    const [{ default: jsPDF }] = await Promise.all([import("jspdf")]);

    // Rasterize every SVG to a PNG data-URL. The PNGs are the source of truth
    // for both the "SVG-per-page" fast path (lead-sheet) AND as replacements
    // for html2canvas so it never has to parse SVG styles.
    interface Raster { pngUrl: string; jpgUrl: string; vbW: number; vbH: number; boxW: number; boxH: number }
    const svgs = Array.from(container.querySelectorAll("svg"));
    const rasters = new Map<Element, Raster>();
    await Promise.all(
      svgs.map(async (svg) => {
        const rect = svg.getBoundingClientRect();
        const vb = svg.getAttribute("viewBox")?.split(/\s+/).map(Number);
        const vbW = vb?.[2] ?? rect.width ?? 700;
        const vbH = vb?.[3] ?? rect.height ?? 990;
        const boxW = rect.width || 794;
        const boxH = boxW * (vbH / vbW);
        const svgClone = svg.cloneNode(true) as SVGElement;
        if (!svgClone.getAttribute("xmlns"))
          svgClone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        svgClone.setAttribute("width", String(vbW));
        svgClone.setAttribute("height", String(vbH));
        const xml = new XMLSerializer().serializeToString(svgClone);
        const b64 = btoa(unescape(encodeURIComponent(xml)));
        const svgUrl = `data:image/svg+xml;base64,${b64}`;
        const { pngUrl, jpgUrl } = await new Promise<{ pngUrl: string; jpgUrl: string }>((resolve, reject) => {
          const im = new Image();
          im.onload = () => {
            // Cap raster at ~2200px wide so PDFs stay under a few MB.
            const targetW = Math.min(2200, vbW * 1.5);
            const scale = targetW / vbW;
            const cv = document.createElement("canvas");
            cv.width = Math.max(1, Math.round(vbW * scale));
            cv.height = Math.max(1, Math.round(vbH * scale));
            const ctx = cv.getContext("2d");
            if (!ctx) return reject(new Error("2d ctx"));
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, cv.width, cv.height);
            ctx.drawImage(im, 0, 0, cv.width, cv.height);
            try {
              resolve({
                pngUrl: cv.toDataURL("image/png"),
                jpgUrl: cv.toDataURL("image/jpeg", 0.9),
              });
            } catch (e) { reject(e as Error); }
          };
          im.onerror = () => reject(new Error("SVG load failed"));
          im.src = svgUrl;
        });
        const img = document.createElement("img");
        img.src = pngUrl;
        img.style.display = "block";
        img.style.width = `${boxW}px`;
        img.style.height = `${boxH}px`;
        rasters.set(img, { pngUrl, jpgUrl, vbW, vbH, boxW, boxH });
        svg.parentNode?.replaceChild(img, svg);
      }),
    );

    const sections = Array.from(
      container.querySelectorAll<HTMLElement>("[data-pdf-section]"),
    );
    if (sections.length === 0) throw new Error("No sections to export");

    // Fast path: each section is a single full-page SVG (lead-sheet). Skip
    // html2canvas entirely — one PNG per section → one PDF page.
    const svgOnlySections = sections.every((s) => {
      const kids = Array.from(s.children);
      return kids.length === 1 && kids[0].tagName === "IMG" && rasters.has(kids[0]);
    });

    if (svgOnlySections) {
      if (format === "sheet") {
        for (let i = 0; i < sections.length; i++) {
          const r = rasters.get(sections[i].firstElementChild as Element)!;
          const a = document.createElement("a");
          a.href = r.pngUrl;
          a.download = buildFilename(
            song,
            layout,
            `sheet${sections.length > 1 ? `-${i + 1}` : ""}.png`,
          );
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
        return;
      }
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      sections.forEach((s, i) => {
        if (i > 0) pdf.addPage();
        const r = rasters.get(s.firstElementChild as Element)!;
        // Fit the rendered SVG page onto A4 while preserving aspect.
        const aspect = r.vbH / r.vbW;
        let w = A4_W_MM;
        let h = w * aspect;
        if (h > A4_H_MM) { h = A4_H_MM; w = h / aspect; }
        const x = (A4_W_MM - w) / 2;
        const y = (A4_H_MM - h) / 2;
        pdf.addImage(r.jpgUrl, "JPEG", x, y, w, h);
      });
      pdf.save(buildFilename(song, layout, "pdf"));
      return;
    }

    // Standard path (blekker) — snapshot each section via html2canvas.
    const [{ default: html2canvas }] = await Promise.all([import("html2canvas")]);
    const cloneOptions = {
      onclone: (doc: Document) => {
        doc.querySelectorAll('style, link[rel="stylesheet"]').forEach((n) => n.remove());
        doc.documentElement.style.background = "#ffffff";
        doc.body.style.background = "#ffffff";
        doc.body.style.color = "#000000";
      },
    };

    const rendered: { dataUrl: string; heightMM: number }[] = [];
    for (const el of sections) {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        ...cloneOptions,
      });
      const pxW = canvas.width / 2;
      const pxH = canvas.height / 2;
      const s = CONTENT_W_MM / pxW;
      rendered.push({
        dataUrl: canvas.toDataURL("image/jpeg", 0.92),
        heightMM: pxH * s,
      });
    }

    if (format === "sheet") {
      for (let i = 0; i < sections.length; i++) {
        const canvas = await html2canvas(sections[i], {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
          ...cloneOptions,
        });
        const url = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = url;
        a.download = buildFilename(
          song,
          layout,
          `sheet${sections.length > 1 ? `-${i + 1}` : ""}.png`,
        );
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      return;
    }

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
    pages.forEach((pageSections, pageIdx) => {
      if (pageIdx > 0) pdf.addPage();
      const totalSecH = pageSections.reduce((s, x) => s + x.heightMM, 0);
      const gaps = pageSections.length - 1;
      const remaining = CONTENT_H_MM - totalSecH;
      const gap = gaps > 0 ? Math.max(GAP_MM, Math.min(remaining / gaps, 40)) : 0;
      let y = MARGIN_MM;
      for (const r of pageSections) {
        pdf.addImage(r.dataUrl, "JPEG", MARGIN_MM, y, CONTENT_W_MM, r.heightMM);
        y += r.heightMM + gap;
      }
    });

    pdf.save(buildFilename(song, layout, "pdf"));
  } finally {
    setTimeout(() => {
      root.unmount();
      host.remove();
    }, 0);
  }
}
