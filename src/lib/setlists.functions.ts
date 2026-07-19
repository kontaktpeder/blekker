import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const listSetlists = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("setlists")
    .select("id, name, description, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getSetlist = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: setlist, error } = await supabaseAdmin
      .from("setlists")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);

    const { data: items, error: itemsErr } = await supabaseAdmin
      .from("setlist_songs")
      .select(
        "id, position, arrangement_id, arrangements(id, current_key, song_id, songs(id, title, artist, bpm, original_key, capo))",
      )
      .eq("setlist_id", data.id)
      .order("position", { ascending: true });
    if (itemsErr) throw new Error(itemsErr.message);

    return { setlist, items: items ?? [] };
  });

export const createSetlist = createServerFn({ method: "POST" })
  .inputValidator((input: { name: string; description?: string }) =>
    z.object({
      name: z.string().min(1).max(120),
      description: z.string().max(500).optional(),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("setlists")
      .insert({ name: data.name, description: data.description ?? null })
      .select()
      .single();
    if (error || !row) throw new Error(error?.message ?? "Failed");
    return row;
  });

export const addSongToSetlist = createServerFn({ method: "POST" })
  .inputValidator((input: { setlistId: string; songId: string }) =>
    z.object({
      setlistId: z.string().uuid(),
      songId: z.string().uuid(),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    // get latest arrangement for the song
    const { data: arr, error: arrErr } = await supabaseAdmin
      .from("arrangements")
      .select("id")
      .eq("song_id", data.songId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (arrErr) throw new Error(arrErr.message);
    if (!arr) throw new Error("Song has no arrangement yet");

    const { data: last } = await supabaseAdmin
      .from("setlist_songs")
      .select("position")
      .eq("setlist_id", data.setlistId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    const position = (last?.position ?? -1) + 1;

    const { error } = await supabaseAdmin
      .from("setlist_songs")
      .insert({ setlist_id: data.setlistId, arrangement_id: arr.id, position });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reorderSetlist = createServerFn({ method: "POST" })
  .inputValidator((input: { setlistId: string; orderedIds: string[] }) =>
    z.object({
      setlistId: z.string().uuid(),
      orderedIds: z.array(z.string().uuid()).max(200),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    // simple sequential update
    for (let i = 0; i < data.orderedIds.length; i++) {
      const { error } = await supabaseAdmin
        .from("setlist_songs")
        .update({ position: i })
        .eq("id", data.orderedIds[i])
        .eq("setlist_id", data.setlistId);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const removeFromSetlist = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("setlist_songs").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
