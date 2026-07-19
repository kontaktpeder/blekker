/**
 * Section labels → Norwegian for Norwegian band charts.
 * Song lyrics stay in the source language; only rehearsal marks / form labels change.
 */

import type { SectionType } from "./music";

/** Strip accents for matching (refräng → refrang). */
export function foldAccents(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "");
}

export function normalizeSectionName(name: string): string {
  return foldAccents(name)
    .replace(/^\[|\]$/g, "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

export type SectionKind =
  | "intro"
  | "verse"
  | "prechorus"
  | "chorus"
  | "bridge"
  | "solo"
  | "interlude"
  | "stick"
  | "outro"
  | "other";

export function sectionKindKey(name: string): { kind: SectionKind; num: number | null } {
  let n = normalizeSectionName(name);
  let num: number | null = null;
  const trailing = n.match(/\s+(\d+)\s*$/);
  const leading = n.match(/^(\d+)\s+/);
  if (trailing) {
    num = parseInt(trailing[1], 10);
    n = n.replace(/\s+\d+\s*$/, "").trim();
  } else if (leading) {
    num = parseInt(leading[1], 10);
    n = n.replace(/^\d+\s+/, "").trim();
  }
  // Drop filler words
  n = n.replace(/\b(the|en|ett|den|det)\b/g, " ").replace(/\s+/g, " ").trim();

  if (/^intro/.test(n)) return { kind: "intro", num };
  if (/^(outro|ending|slut|coda\b)/.test(n)) return { kind: "outro", num };
  if (/^(solo|instrumental|riff)/.test(n)) return { kind: "solo", num };
  if (/^(mellan|mellom|interlude|instrumental\s*break)/.test(n)) return { kind: "interlude", num };
  if (/^(stick|stikk|middle\s*8|midterste)/.test(n)) return { kind: "stick", num };
  if (/^(bryg|bridg)/.test(n)) return { kind: "bridge", num };
  if (
    /^(pre|forre|for-?re)/.test(n) ||
    (/pre/.test(n) && /(chorus|refr)/.test(n))
  ) {
    return { kind: "prechorus", num };
  }
  if (/^(chorus|refr|hook|omkv|chorus)/.test(n) || n === "chorus") return { kind: "chorus", num };
  if (/^(vers|verse)/.test(n)) return { kind: "verse", num };
  return { kind: "other", num };
}

const KIND_LABEL_NO: Record<SectionKind, string> = {
  intro: "Intro",
  verse: "Vers",
  prechorus: "Pre-refreng",
  chorus: "Refreng",
  bridge: "Bro",
  solo: "Solo",
  interlude: "Mellomspill",
  stick: "Bro",
  outro: "Outro",
  other: "Del",
};

/** Map any EN/SV/NO rehearsal mark to a Norwegian label (keeps numbers). */
export function localizeSectionLabel(name: string): string {
  const raw = name.replace(/^\[|\]$/g, "").trim();
  if (!raw) return "Del";
  const { kind, num } = sectionKindKey(raw);
  if (kind === "other") {
    // Title-case unknown labels but don't invent meaning
    return raw
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }
  const base = KIND_LABEL_NO[kind];
  return num != null ? `${base} ${num}` : base;
}

export function kindToSectionType(kind: SectionKind): SectionType {
  switch (kind) {
    case "intro":
      return "intro";
    case "outro":
      return "outro";
    case "chorus":
    case "prechorus":
      return "chorus";
    case "bridge":
    case "stick":
      return "bridge";
    case "solo":
      return "solo";
    case "interlude":
      return "interlude";
    case "verse":
    default:
      return "verse";
  }
}

/** Same musical role (and number when both have one). */
export function sectionNamesCompatible(a: string, b: string): boolean {
  const ka = sectionKindKey(a);
  const kb = sectionKindKey(b);
  if (ka.kind === "other" || kb.kind === "other") {
    const na = normalizeSectionName(a);
    const nb = normalizeSectionName(b);
    if (na === nb) return true;
    const compact = (s: string) => s.replace(/[\s-]+/g, "");
    return compact(na) === compact(nb) || na.startsWith(nb) || nb.startsWith(na);
  }
  if (ka.kind !== kb.kind) {
    // Bridge family: bridge ↔ stick (both "Bro" on charts)
    const bridgeFamily = (k: SectionKind) => k === "bridge" || k === "stick";
    if (!(bridgeFamily(ka.kind) && bridgeFamily(kb.kind))) return false;
  }
  if (ka.num != null && kb.num != null) return ka.num === kb.num;
  return true;
}
