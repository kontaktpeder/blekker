import type { Section, SectionType, Song } from "./music";
import {
  kindToSectionType,
  localizeSectionLabel,
  normalizeSectionName,
  sectionKindKey,
  sectionNamesCompatible,
} from "./section-labels-no";
import { localizeBandNotes } from "./band-notes-no";

const SKIP_HEADERS = /^(tab|chords?|lyrics?|solo tab|splo|intro tab)$/i;
const CHORD_ONLY = /^[A-G][#b]?(?:m|maj|min|dim|aug|sus|add|maj7|m7|m9|m11|m13|9|11|13|6|7|2|4|5)*(?:\/[A-G][#b]?)?$/i;

export { normalizeSectionName, localizeSectionLabel };

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
  return kindToSectionType(sectionKindKey(name).kind);
}

function hasRealChords(s: Section): boolean {
  return s.chords.some((c) => {
    const t = (c ?? "").trim();
    return t && t !== "-" && t !== "%";
  });
}

function chordRichness(s: Section): number {
  return s.chords.filter((c) => {
    const t = (c ?? "").trim();
    return t && t !== "-" && t !== "%";
  }).length;
}

function cloneSection(src: Section, id: string, name: string): Section {
  const label = localizeSectionLabel(name);
  return {
    ...src,
    id,
    name: label,
    type: inferType(label),
    chords: [...src.chords],
    lyrics: src.lyrics,
    notes: src.notes ? localizeBandNotes(src.notes) : src.notes,
  };
}

function emptySection(id: string, name: string): Section {
  const label = localizeSectionLabel(name);
  return {
    id,
    type: inferType(label),
    name: label,
    bars: 4,
    chords: ["-", "-", "-", "-"],
  };
}

function findBestMatch(
  sections: Section[],
  formName: string,
  used: Set<number>,
): number {
  const prefer = (pred: (s: Section, j: number) => boolean) => {
    let best = -1;
    let bestScore = -1;
    sections.forEach((s, j) => {
      if (!pred(s, j)) return;
      const score = chordRichness(s) * 10 + (hasRealChords(s) ? 1000 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = j;
      }
    });
    return best;
  };

  const n = normalizeSectionName(formName);
  const want = sectionKindKey(formName);

  // 1) Unused exact name
  let idx = prefer(
    (s, j) => !used.has(j) && normalizeSectionName(s.name) === n,
  );
  if (idx >= 0) return idx;

  // 2) Unused compatible (kind + number)
  idx = prefer(
    (s, j) => !used.has(j) && sectionNamesCompatible(formName, s.name),
  );
  if (idx >= 0) return idx;

  // 3) Unused same kind (ignore number) — fills "Refreng" from "Chorus"
  idx = prefer((s, j) => {
    if (used.has(j)) return false;
    const k = sectionKindKey(s.name);
    return k.kind === want.kind && want.kind !== "other";
  });
  if (idx >= 0) return idx;

  // 4) Reuse any compatible with content
  idx = prefer(
    (s, j) => sectionNamesCompatible(formName, s.name) && hasRealChords(s),
  );
  if (idx >= 0) return idx;

  // 5) Reuse richest same-kind with content
  idx = prefer((s) => {
    const k = sectionKindKey(s.name);
    return k.kind === want.kind && want.kind !== "other" && hasRealChords(s);
  });
  if (idx >= 0) return idx;

  // 6) Any exact / compatible even if empty
  idx = prefer((s) => normalizeSectionName(s.name) === n);
  if (idx >= 0) return idx;
  idx = prefer((s) => sectionNamesCompatible(formName, s.name));
  return idx;
}

/**
 * Expand a section library against a play-order `form`.
 * Matches EN/SV/NO labels by musical role so Refräng ↔ Chorus ↔ Refreng.
 * Never invents empty bars when a contentful same-role section exists.
 */
export function expandSectionsByForm(sections: Section[], form: string[]): Section[] {
  if (!form.length) return sections.map((s) => cloneSection(s, s.id, s.name));
  if (
    form.length === sections.length &&
    form.every((f, i) => normalizeSectionName(f) === normalizeSectionName(sections[i]?.name ?? ""))
  ) {
    return sections.map((s, i) => cloneSection(s, s.id || `f${i + 1}`, form[i] || s.name));
  }

  const used = new Set<number>();
  const result: Section[] = [];

  form.forEach((formName, i) => {
    const label = formName.replace(/^\[|\]$/g, "").trim() || `Del ${i + 1}`;
    const id = `f${i + 1}`;
    const idx = findBestMatch(sections, label, used);

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
  const mismatchAt = expected.findIndex((e, i) => {
    const g = got[i];
    if (!g) return true;
    return !sectionNamesCompatible(e, g);
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
 * Labels are normalized to Norwegian.
 */
export function resolvePlayOrder(song: Pick<Song, "sections" | "form">): {
  form: string[];
  sections: Section[];
} {
  const structure = (song.form ?? []).map((s) => localizeSectionLabel(s));
  const sections = (song.sections ?? []).map((s, i) =>
    cloneSection(s, s.id || `s${i + 1}`, s.name),
  );

  if (structure.length > sections.length) {
    const expanded = expandSectionsByForm(song.sections ?? [], song.form ?? []);
    return {
      form: expanded.map((s) => s.name),
      sections: expanded,
    };
  }

  if (sections.length >= structure.length && sections.length > 0) {
    return {
      form: sections.map((s) => s.name),
      sections,
    };
  }

  if ((song.form ?? []).length > 0) {
    const expanded = expandSectionsByForm(song.sections ?? [], song.form ?? []);
    return {
      form: expanded.map((s) => s.name),
      sections: expanded,
    };
  }

  return { form: sections.map((s) => s.name), sections };
}

/**
 * After AI parse: force form from UG headers when present, expand sections
 * to full play order, Norwegian labels/notes, and return fidelity status.
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
  band_notes?: string | null;
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
    structure: expanded.map((s) => s.name),
    sections: expanded.map((s, i) => ({
      id: s.id || `s${i + 1}`,
      type: s.type,
      name: s.name,
      bars: s.bars,
      chords: s.chords,
      lyrics: s.lyrics ?? null,
      notes: s.notes ? localizeBandNotes(s.notes) : null,
      repeat: s.repeat ?? null,
    })),
    band_notes: arrangement.band_notes
      ? localizeBandNotes(arrangement.band_notes)
      : arrangement.band_notes ?? null,
  } as T;

  const fidelity = checkFormFidelity(source, form);
  return { arrangement: next, fidelity };
}
