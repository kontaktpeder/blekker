import type { Song, Section, SectionType } from "./music";

type DbSection = {
  id?: string;
  type?: string;
  name?: string;
  bars?: number;
  chords?: unknown;
  lyrics?: string | null;
  notes?: string | null;
  repeat?: number | null;
};

type DbSong = {
  id: string;
  title: string;
  artist: string | null;
  original_key: string | null;
  bpm: number | null;
  capo: number | null;
};

type DbArrangement = {
  current_key: string | null;
  structure: unknown;
  sections: unknown;
};

const ALLOWED: SectionType[] = [
  "intro", "verse", "chorus", "bridge", "outro", "interlude", "solo",
];

function normType(t: string | undefined, name: string | undefined): SectionType {
  const lower = (t ?? name ?? "").toLowerCase();
  for (const a of ALLOWED) if (lower.includes(a)) return a;
  if (lower.includes("pre")) return "verse";
  if (lower.includes("hook")) return "chorus";
  if (lower.includes("instrumental")) return "solo";
  return "verse";
}

function asStringArray(x: unknown): string[] {
  if (Array.isArray(x)) return x.map((v) => String(v ?? ""));
  return [];
}

export function dbToSong(song: DbSong, arr: DbArrangement | null): Song {
  const sectionsRaw = Array.isArray(arr?.sections) ? (arr!.sections as DbSection[]) : [];
  const sections: Section[] = sectionsRaw.map((s, i) => {
    const chords = asStringArray(s.chords);
    const bars = typeof s.bars === "number" && s.bars > 0 ? s.bars : Math.max(1, chords.length);
    return {
      id: s.id ?? `s${i}`,
      type: normType(s.type, s.name),
      name: s.name ?? "Section",
      bars,
      chords: chords.length ? chords : Array(bars).fill("-"),
      lyrics: s.lyrics ?? undefined,
      notes: s.notes ?? undefined,
      repeat: s.repeat ?? undefined,
    };
  });

  const structure = Array.isArray(arr?.structure)
    ? (arr!.structure as unknown[]).map((v) => String(v))
    : sections.map((s) => s.name);

  return {
    id: song.id,
    title: song.title,
    artist: song.artist ?? "—",
    key: arr?.current_key || song.original_key || "C",
    bpm: song.bpm ?? 100,
    capo: song.capo ?? 0,
    timeSig: "4/4",
    form: structure,
    sections,
  };
}
