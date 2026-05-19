import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useSetlists, useCreateSetlist } from "@/hooks/useSongs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TopNav } from "@/components/chart/TopNav";
import { toast } from "sonner";

export const Route = createFileRoute("/setlists/")({
  head: () => ({
    meta: [
      { title: "Setlists — Stagechart" },
      { name: "description", content: "Build and play setlists." },
    ],
  }),
  component: SetlistsPage,
});

function SetlistsPage() {
  const { data, isLoading } = useSetlists();
  const create = useCreateSetlist();
  const [name, setName] = useState("");

  const submit = async () => {
    if (!name.trim()) return;
    try {
      const sl = await create.mutateAsync({ name: name.trim() });
      setName("");
      toast.success(`Created "${sl.name}"`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <TopNav />
      <div className="px-6 md:px-12 py-8 flex-1 max-w-5xl w-full">
        <p className="font-mono uppercase tracking-[0.3em] text-xs text-muted-foreground">
          Setlists
        </p>
        <h1 className="mt-2 text-3xl md:text-5xl font-semibold tracking-tight">
          Tonight's set
        </h1>

        <div className="mt-6 flex gap-2 max-w-lg">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New setlist name…"
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className="h-11"
          />
          <Button onClick={submit} disabled={create.isPending} className="h-11">
            <Plus className="h-4 w-4 mr-1" /> Create
          </Button>
        </div>

        <ul className="mt-8 grid gap-3 md:grid-cols-2">
          {isLoading && (
            <li className="text-muted-foreground font-mono text-sm">Loading…</li>
          )}
          {data?.map((sl) => (
            <li key={sl.id}>
              <Link
                to="/setlists/$id"
                params={{ id: sl.id }}
                className="block rounded-xl border border-border bg-card/40 hover:bg-card p-5 transition-colors"
              >
                <p className="text-lg font-semibold">{sl.name}</p>
                {sl.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {sl.description}
                  </p>
                )}
                <p className="mt-4 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  Open →
                </p>
              </Link>
            </li>
          ))}
          {!isLoading && (data?.length ?? 0) === 0 && (
            <li className="text-muted-foreground">No setlists yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
