import { createRoot } from "react-dom/client";
import { createElement } from "react";
import { type Song } from "@/lib/music";
import { LAYOUTS, type ExportLayout, type ExportFormat } from "./layouts";

interface ExportOptions {
  song: Song;
  semitones: number;
  showLyrics: boolean;
  layout?: ExportLayout;
  format?: ExportFormat;
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
      root.render(createElement(LayoutComponent, { song, semitones, showLyrics }));
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    const container = host.firstElementChild as HTMLElement | null;
    if (!container) throw new Error("Failed to render printable chart");

    // html2canvas walks SVG element styles and dies on Tailwind v4's `lab()`
    // colors. Rasterize every <svg> to a data-URL <img> in the SOURCE tree
    // BEFORE html2canvas touches it (onclone runs too late for SVG parsing).
    const svgs = container.querySelectorAll("svg");
    console.log("[pdf export] rasterizing svgs:", svgs.length, "layout:", layout);
    svgs.forEach((svg) => {
      const rect = svg.getBoundingClientRect();
      const svgClone = svg.cloneNode(true) as SVGElement;
      if (!svgClone.getAttribute("xmlns"))
        svgClone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      const xml = new XMLSerializer().serializeToString(svgClone);
      const b64 = btoa(unescape(encodeURIComponent(xml)));
      const img = document.createElement("img");
      img.src = `data:image/svg+xml;base64,${b64}`;
      img.style.display = "block";
      img.style.width = `${rect.width || 700}px`;
      img.style.height = `${rect.height || 44}px`;
      svg.parentNode?.replaceChild(img, svg);
    });

    const sections = Array.from(
      container.querySelectorAll<HTMLElement>("[data-pdf-section]"),
    );
    if (sections.length === 0) throw new Error("No sections to export");

    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);

    // html2canvas chokes on Tailwind v4's `lab()` colors when it walks SVG
    // elements. Pre-rasterize every <svg> to a data-URL <img> in the clone
    // so html2canvas only sees plain raster images.
    const rasterizeSvgs = (doc: Document) => {
      doc.querySelectorAll("svg").forEach((svg) => {
        const clone = svg.cloneNode(true) as SVGElement;
        if (!clone.getAttribute("xmlns"))
          clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        const xml = new XMLSerializer().serializeToString(clone);
        const b64 = btoa(unescape(encodeURIComponent(xml)));
        const img = doc.createElement("img");
        img.src = `data:image/svg+xml;base64,${b64}`;
        img.style.display = "block";
        img.style.width = svg.style.width || svg.getAttribute("width") || "100%";
        const hAttr = svg.getAttribute("height");
        if (hAttr) img.style.height = /^\d+$/.test(hAttr) ? `${hAttr}px` : hAttr;
        svg.parentNode?.replaceChild(img, svg);
      });
    };

    const cloneOptions = {
      onclone: (doc: Document) => {
        doc.querySelectorAll('style, link[rel="stylesheet"]').forEach((n) => n.remove());
        doc.documentElement.style.background = "#ffffff";
        doc.body.style.background = "#ffffff";
        doc.body.style.color = "#000000";
        const before = doc.querySelectorAll("svg").length;
        rasterizeSvgs(doc);
        const after = doc.querySelectorAll("svg").length;
        console.log("[pdf export] rasterized svgs", before, "->", after);
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
      const scale = CONTENT_W_MM / pxW;
      rendered.push({
        dataUrl: canvas.toDataURL("image/jpeg", 0.92),
        heightMM: pxH * scale,
      });
    }

    if (format === "sheet") {
      // Per-Sheet: render each section as its own PNG image download.
      // Uses full-resolution snapshot rather than the paginated PDF flow.
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

    // PDF: pack sections into pages (max 2 target, overflow allowed).
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
