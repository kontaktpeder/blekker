import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  createSongFromInput,
  deleteSong,
  getSong,
  listSongs,
  updateSong,
} from "@/lib/songs.functions";
import {
  addSongToSetlist,
  createSetlist,
  getSetlist,
  listSetlists,
  removeFromSetlist,
  reorderSetlist,
} from "@/lib/setlists.functions";

export function useSongs() {
  const fn = useServerFn(listSongs);
  return useQuery({
    queryKey: ["songs"],
    queryFn: () => fn(),
  });
}

export function useSong(id: string | undefined) {
  const fn = useServerFn(getSong);
  return useQuery({
    queryKey: ["songs", id],
    queryFn: () => fn({ data: { id: id! } }),
    enabled: !!id,
  });
}

export function useCreateSongFromInput() {
  const fn = useServerFn(createSongFromInput);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { sourceUrl?: string; rawInput?: string }) =>
      fn({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["songs"] });
    },
  });
}

export function useDeleteSong() {
  const fn = useServerFn(deleteSong);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["songs"] });
      qc.invalidateQueries({ queryKey: ["setlists"] });
    },
  });
}

export function useUpdateSong() {
  const fn = useServerFn(updateSong);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id: string;
      title: string;
      artist?: string | null;
      key?: string | null;
      bpm?: number | null;
      capo?: number | null;
      sections: {
        id?: string;
        type?: string;
        name: string;
        bars?: number;
        chords: string[];
        lyrics?: string | null;
        notes?: string | null;
        repeat?: number | null;
      }[];
    }) => fn({ data: input }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["songs"] });
      qc.invalidateQueries({ queryKey: ["songs", v.id] });
    },
  });
}

export function useSetlists() {
  const fn = useServerFn(listSetlists);
  return useQuery({ queryKey: ["setlists"], queryFn: () => fn() });
}

export function useSetlist(id: string | undefined) {
  const fn = useServerFn(getSetlist);
  return useQuery({
    queryKey: ["setlists", id],
    queryFn: () => fn({ data: { id: id! } }),
    enabled: !!id,
  });
}

export function useCreateSetlist() {
  const fn = useServerFn(createSetlist);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; description?: string }) =>
      fn({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["setlists"] }),
  });
}

export function useAddSongToSetlist() {
  const fn = useServerFn(addSongToSetlist);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { setlistId: string; songId: string }) =>
      fn({ data: input }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["setlists", v.setlistId] });
      qc.invalidateQueries({ queryKey: ["setlists"] });
    },
  });
}

export function useReorderSetlist() {
  const fn = useServerFn(reorderSetlist);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { setlistId: string; orderedIds: string[] }) =>
      fn({ data: input }),
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: ["setlists", v.setlistId] }),
  });
}

export function useRemoveFromSetlist(setlistId: string | undefined) {
  const fn = useServerFn(removeFromSetlist);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fn({ data: { id } }),
    onSuccess: () => {
      if (setlistId) qc.invalidateQueries({ queryKey: ["setlists", setlistId] });
    },
  });
}
