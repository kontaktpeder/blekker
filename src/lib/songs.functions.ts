import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SectionSchema = z.object({
  id: z.string().optional(),
  type: z.string().optional(),
  name: z.string(),
  bars: z.number().int().positive().max(64).optional(),
  chords: z.array(z.string()).default([]),
  lyrics: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  repeat: z.number().int().min(1).max(20).nullable().optional(),
});

const ArrangementSchema = z.object({
  title: z.string().min(1).max(200),
  artist: z.string().max(200).optional().nullable(),
  original_key: z.string().max(8).optional().nullable(),
  current_key: z.string().max(8).optional().nullable(),
  bpm: z.number().int().min(20).max(300).optional().nullable(),
  capo: z.number().int().min(0).max(12).optional().nullable(),
  structure: z.array(z.string()).default([]),
  sections: z.array(SectionSchema).default([]),
  band_notes: z.string().max(4000).optional().nullable(),
});

export const listSongs = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("songs")
    .select("id, title, artist, original_key, bpm, capo, updated_at")
    .order("updated_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getSong = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: song, error } = await supabaseAdmin
      .from("songs")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);

    const { data: arr } = await supabaseAdmin
      .from("arrangements")
      .select("*")
      .eq("song_id", data.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    return { song, arrangement: arr ?? null };
  });

export const deleteSong = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("songs").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * generate-chart: takes raw text or a URL, returns strict JSON arrangement,
 * persists song + arrangement, returns the new song id.
 */
export const createSongFromInput = createServerFn({ method: "POST" })
  .inputValidator((input: { sourceUrl?: string; rawInput?: string }) =>
    z.object({
      sourceUrl: z.string().url().max(2000).optional(),
      rawInput: z.string().max(50000).optional(),
    }).refine((v) => v.sourceUrl || v.rawInput, "Provide sourceUrl or rawInput")
      .parse(input),
  )
  .handler(async ({ data }) => {
    let source = data.rawInput?.trim() ?? "";

    // 1) If a URL is given, fetch its text content
    if (data.sourceUrl) {
      try {
        const res = await fetch(data.sourceUrl, {
          headers: { "User-Agent": "Stagechart/1.0" },
        });
        if (res.ok) {
          const html = await res.text();
          // crude strip — model will tolerate noise
          const text = html
            .replace(/<script[\s\S]*?<\/script>/gi, "")
            .replace(/<style[\s\S]*?<\/style>/gi, "")
            .replace(/<[^>]+>/g, "\n")
            .replace(/\n{3,}/g, "\n\n")
            .trim()
            .slice(0, 25000);
          source = source ? `${source}\n\n---\n\n${text}` : text;
        }
      } catch (e) {
        console.error("URL fetch failed", e);
      }
    }

    if (!source) throw new Error("Could not get any content from the input.");

    // 2) Call Lovable AI with strict JSON instruction
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const system = `You are a music chart parser for a working band.
You receive messy lyrics + chords (possibly Ultimate Guitar style, or a Norwegian/English webpage) and you ALWAYS return a clean, standardized arrangement as STRICT JSON.

The JSON MUST match this TypeScript shape exactly:

{
  "title": string,
  "artist": string,
  "original_key": string,       // e.g. "G", "Am", "F#"
  "current_key": string,        // same as original_key unless transposition is obvious
  "bpm": number,                // best guess, integer 60-200
  "capo": number,               // 0 if unknown
  "structure": string[],        // e.g. ["Intro","Verse","Chorus","Verse","Chorus","Bridge","Chorus","Chorus"]
  "sections": [
    {
      "id": string,             // short unique id like "s1","s2"
      "type": "intro"|"verse"|"chorus"|"bridge"|"outro"|"interlude"|"solo",
      "name": string,           // "Intro", "Verse 1", "Chorus", ...
      "bars": number,           // 1..32, integer
      "chords": string[],       // ONE chord per bar; use "%" to repeat previous bar
      "lyrics": string|null,    // plain lyrics for this section, line-broken, no chord markers inline
      "notes": string|null,     // short band note, e.g. "Drop to half-time", or null
      "repeat": number|null     // play this section N times, null if 1
    }
  ],
  "band_notes": string|null     // 1-3 sentences of overall arrangement notes
}

Rules:
- Always output bars as one chord per bar. If a bar holds 2 chords, pick the strongest.
- Use sharps in chord symbols by default (C#, F#) unless source clearly uses flats.
- Strip out tab numbers, [Verse] markers, capo notes — they go into the structured fields, not lyrics.
- Never add commentary outside the JSON. No markdown fences.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: source },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const body = await aiRes.text().catch(() => "");
      if (aiRes.status === 429) throw new Error("AI rate limit reached. Try again shortly.");
      if (aiRes.status === 402) throw new Error("AI credits exhausted. Add credits in Workspace settings.");
      throw new Error(`AI gateway error ${aiRes.status}: ${body.slice(0, 200)}`);
    }

    const json = (await aiRes.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content ?? "";
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("AI did not return valid JSON.");
    }

    const arrangement = ArrangementSchema.parse(parsed);

    // 3) Persist
    const { data: song, error: songErr } = await supabaseAdmin
      .from("songs")
      .insert({
        title: arrangement.title,
        artist: arrangement.artist ?? null,
        original_key: arrangement.original_key ?? null,
        bpm: arrangement.bpm ?? null,
        capo: arrangement.capo ?? 0,
        source_url: data.sourceUrl ?? null,
        raw_input: data.rawInput ?? null,
      })
      .select()
      .single();
    if (songErr || !song) throw new Error(songErr?.message ?? "Failed to save song");

    const { error: arrErr } = await supabaseAdmin.from("arrangements").insert({
      song_id: song.id,
      version: 1,
      current_key: arrangement.current_key ?? arrangement.original_key ?? null,
      structure: arrangement.structure,
      sections: arrangement.sections,
      band_notes: arrangement.band_notes ?? null,
    });
    if (arrErr) throw new Error(arrErr.message);

    return { id: song.id as string };
  });
