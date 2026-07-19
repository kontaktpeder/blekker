import type { Section, SectionType, Song } from "./music";

const SKIP_HEADERS = /^(tab|chords?|lyrics?|solo tab|splo|intro tab)$/i;
const CHORD_ONLY = /^[A-G][#b]?(?:m|maj|min|dim|aug|sus|add|maj7|m7|m9|m11|m13|9|11|13|6|7|2|4|5)*(?:\/[A-G][#b]?)?$/i;

/** Normalize section labels for matching (`[Chorus]` → `chorus`). */
export function normalizeSectionName(name: string): string {
  return name
    .replace(/^\[|\]$/g, "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

/**
 * Pull Ultimate Guitar / chords-over-words section headers in document order.
 * Never collapses duplicates — every `[Chorus]` counts.
 */
export function extractUgSectionOrder(source: string): string[] {
  const re = /\[([^\]]{1,60})\]/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    const inner = m[1].trim();
    if (!inner || SKIP_HEADERS.test(inner) || CHORD_ONLY.test(inner)) continue;
    out.push(inner);
  }
  return out;
}

function inferType(name: string): SectionType {
  const n = normalizeSectionName(name);
  if (n.includes("intro")) return "intro";
  if (n.includes("outro")) return "outro";
  if (n.includes("bridge")) return "bridge";
  if (n.includes("solo") || n.includes("instrumental")) return "solo";
  if (n.includes("interlude")) return "interlude";
  if (n.includes("chorus") || n.includes("hook") || n.includes("refrain")) return "chorus";
  if (n.includes("pre")) return "verse";
  return "verse";
}

function namesCompatible(formNorm: string, sectionNorm: string): boolean {
  if (formNorm === sectionNorm) return true;
  if (formNorm.startsWith(sectionNorm) || sectionNorm.startsWith(formNorm)) return true;
  // "pre-chorus" vs "prechorus" / "pre chorus"
  const compact = (s: string) => s.replace(/[\s-]+/g, "");
  if (compact(formNorm) === compact(sectionNorm)) return true;
  // "chorus" matches "final chorus" / "chorus 2"
  const formCore = formNorm.replace(/^\d+\s*/, "").replace(/\s*\d+$/, "").trim();
  const secCore = sectionNorm.replace(/^\d+\s*/, "").replace(/\s*\d+$/, "").trim();
  if (formCore && secCore && (formCore === secCore || formCore.includes(secCore) || secCore.includes(formCore))) {
    return true;
  }
  return false;
}

function cloneSection(src: Section, id: string, name: string): Section {
  return {
    ...src,
    id,
    name,
    type: inferType(name),
    chords: [...src.chords],
  };
}

function emptySection(id: string, name: string): Section {
  return {
    id,
    type: inferType(name),
    name,
    bars: 4,
    chords: ["-", "-", "-", "-"],
  };
}

/**
 * Expand a section library against a play-order `form`.
 * Repeated form entries (2nd Chorus, …) reuse matching content when needed.
 */
export function expandSectionsByForm(sections: Section[], form: string[]): Section[] {
  if (!form.length) return sections;
  if (
    form.length === sections.length &&
    form.every((f, i) => normalizeSectionName(f) === normalizeSectionName(sections[i]?.name ?? ""))
  ) {
    return sections;
  }

  const used = new Set<number>();
  const result: Section[] = [];

  form.forEach((formName, i) => {
    const label = formName.replace(/^\[|\]$/g, "").trim() || `Section ${i + 1}`;
    const n = normalizeSectionName(label);
    const id = `f${i + 1}`;

    let idx = sections.findIndex((s, j) => !used.has(j) && normalizeSectionName(s.name) === n);
    if (idx < 0) {
      idx = sections.findIndex((s, j) => !used.has(j) && namesCompatible(n, normalizeSectionName(s.name)));
    }
    if (idx < 0) {
      idx = sections.findIndex((s) => normalizeSectionName(s.name) === n);
    }
    if (idx < 0) {
      idx = sections.findIndex((s) => namesCompatible(n, normalizeSectionName(s.name)));
    }

    if (idx >= 0) {
      used.add(idx);
      result.push(cloneSection(sections[idx], id, label));
    } else {
      result.push(emptySection(id, label));
    }
  });

  return result;
}

export type FormFidelity = {
  ok: boolean;
  expected: string[];
  got: string[];
  message?: string;
};

/** Compare pasted UG headers to the arrangement form (order + count). */
export function checkFormFidelity(source: string, form: string[]): FormFidelity {
  const expected = extractUgSectionOrder(source);
  if (expected.length < 2) {
    return { ok: true, expected, got: form };
  }
  const got = form.map((f) => f.replace(/^\[|\]$/g, "").trim());
  if (got.length < expected.length) {
    return {
      ok: false,
      expected,
      got,
      message: `Form has ${got.length} parts but paste has ${expected.length} section headers — repeats were dropped.`,
    };
  }
  // Soft check: prefix of got should match expected names (compatible)
  const mismatchAt = expected.findIndex((e, i) => {
    const g = got[i];
    if (!g) return true;
    return !namesCompatible(normalizeSectionName(e), normalizeSectionName(g));
  });
  if (mismatchAt >= 0) {
    return {
      ok: false,
      expected,
      got,
      message: `Form diverges at #${mismatchAt + 1}: expected "${expected[mismatchAt]}", got "${got[mismatchAt] ?? "—"}".`,
    };
  }
  return { ok: true, expected, got };
}

/**
 * Canonical play order for charts/PDF:
 * prefer the longer of structure vs sections so repeats are never lost.
 */
export function resolvePlayOrder(song: Pick<Song, "sections" | "form">): {
  form: string[];
  sections: Section[];
} {
  const structure = song.form ?? [];
  const sections = song.sections ?? [];

  if (structure.length > sections.length) {
    const expanded = expandSectionsByForm(sections, structure);
    return { form: structure.map((s) => s.replace(/^\[|\]$/g, "").trim()), sections: expanded };
  }

  if (sections.length >= structure.length && sections.length > 0) {
    return {
      form: sections.map((s) => s.name),
      sections,
    };
  }

  if (structure.length > 0) {
    const expanded = expandSectionsByForm(sections, structure);
    return {
      form: structure.map((s) => s.replace(/^\[|\]$/g, "").trim()),
      sections: expanded,
    };
  }

  return { form: sections.map((s) => s.name), sections };
}

/**
 * After AI parse: force form from UG headers when present, expand sections
 * to full play order, and return fidelity status.
 */
export function enforceUgFormFidelity<T extends {
  structure: string[];
  sections: Array<{
    id?: string;
    type?: string;
    name: string;
    bars?: number;
    chords: string[];
    lyrics?: string | null;
    notes?: string | null;
    repeat?: number | null;
  }>;
}>(arrangement: T, source: string): { arrangement: T; fidelity: FormFidelity } {
  const expected = extractUgSectionOrder(source);
  const asSections: Section[] = arrangement.sections.map((s, i) => ({
    id: s.id ?? `s${i + 1}`,
    type: inferType(s.name),
    name: s.name,
    bars: s.bars && s.bars > 0 ? s.bars : Math.max(1, s.chords?.length ?? 4),
    chords: s.chords?.length ? [...s.chords] : ["-", "-", "-", "-"],
    lyrics: s.lyrics ?? undefined,
    notes: s.notes ?? undefined,
    repeat: s.repeat ?? undefined,
  }));

  const formFromAi = (arrangement.structure ?? []).map((s) => s.replace(/^\[|\]$/g, "").trim());
  const form =
    expected.length >= 2
      ? expected
      : formFromAi.length > 0
        ? formFromAi
        : asSections.map((s) => s.name);

  const expanded = expandSectionsByForm(asSections, form);
  const next = {
    ...arrangement,
    structure: form,
    sections: expanded.map((s, i) => ({
      id: s.id || `s${i + 1}`,
      type: s.type,
      name: s.name,
      bars: s.bars,
      chords: s.chords,
      lyrics: s.lyrics ?? null,
      notes: s.notes ?? null,
      repeat: s.repeat ?? null,
    })),
  } as T;

  const fidelity = checkFormFidelity(source, next.structure);
  return { arrangement: next, fidelity };
}
