import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TopNav } from "@/components/chart/TopNav";
import { useCreateSongFromInput } from "@/hooks/useSongs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/songs/new")({
  head: () => ({
    meta: [
      { title: "New chart — Stagechart" },
      { name: "description", content: "Generate a band chart from a URL or chord sheet." },
    ],
  }),
  component: NewSongPage,
});

const STAGES = [
  "Henter innhold",
  "Rydder akkorder",
  "Bygger blekke",
  "Klargjør visning",
] as const;

function NewSongPage() {
  const [sourceUrl, setSourceUrl] = useState("");
  const [rawInput, setRawInput] = useState("");
  const [stage, setStage] = useState<number | null>(null);
  const mutation = useCreateSongFromInput();
  const navigate = useNavigate();

  const submit = async () => {
    if (!sourceUrl.trim() && !rawInput.trim()) {
      toast.error("Lim inn en URL eller akkord-tekst først.");
      return;
    }
    setStage(0);
    // animate stages until completion
    const interval = setInterval(() => {
      setStage((s) => (s === null ? 0 : Math.min(s + 1, STAGES.length - 2)));
    }, 1200);

    try {
      const res = await mutation.mutateAsync({
        sourceUrl: sourceUrl.trim() || undefined,
        rawInput: rawInput.trim() || undefined,
      });
      clearInterval(interval);
      setStage(STAGES.length - 1);
      await new Promise((r) => setTimeout(r, 400));
      navigate({ to: "/songs/$id", params: { id: res.id } });
    } catch (e) {
      clearInterval(interval);
      setStage(null);
      toast.error(e instanceof Error ? e.message : "Klarte ikke å bygge blekke.");
    }
  };

  const loading = mutation.isPending || stage !== null;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <TopNav />
      <div className="px-6 md:px-12 py-10 max-w-3xl w-full mx-auto flex-1">
        <p className="font-mono uppercase tracking-[0.3em] text-xs text-muted-foreground">
          New chart
        </p>
        <h1 className="mt-2 text-3xl md:text-5xl font-semibold tracking-tight">
          Lag blekke
        </h1>
        <p className="mt-3 text-muted-foreground max-w-xl">
          Lim inn en lenke til akkordsiden eller bare lim akkorder og tekst rett inn.
          Stagechart standardiserer den til et lesbart band-chart.
        </p>

        <div className="mt-8 space-y-5">
          <div>
            <label className="font-mono uppercase tracking-[0.18em] text-[10px] text-muted-foreground">
              Source URL
            </label>
            <Input
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://tabs.ultimate-guitar.com/…"
              className="mt-2 h-12 text-base"
              disabled={loading}
            />
          </div>

          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                or
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>
          </div>

          <div>
            <label className="font-mono uppercase tracking-[0.18em] text-[10px] text-muted-foreground">
              Paste chords + lyrics
            </label>
            <Textarea
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder={"[Verse]\nG       D       Em      C\nOut on the highway where the lights run thin\n…"}
              className="mt-2 min-h-[260px] font-mono text-sm"
              disabled={loading}
            />
          </div>

          <Button
            onClick={submit}
            disabled={loading}
            size="lg"
            className="w-full h-14 text-base"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : (
              <Sparkles className="h-5 w-5 mr-2" />
            )}
            {loading ? "Bygger…" : "Lag blekke"}
          </Button>

          {stage !== null && (
            <ol className="mt-6 space-y-2">
              {STAGES.map((s, i) => {
                const done = stage > i;
                const active = stage === i;
                return (
                  <li
                    key={s}
                    className={cn(
                      "flex items-center gap-3 rounded-md border px-4 py-3 transition-colors",
                      active && "border-primary/40 bg-primary/5",
                      done && "border-border bg-card/40 text-muted-foreground",
                      !active && !done && "border-border/50 text-muted-foreground/60",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full border font-mono text-xs",
                        active && "border-primary text-primary",
                        done && "border-border bg-accent",
                      )}
                    >
                      {done ? "✓" : i + 1}
                    </span>
                    <span className="font-medium">{s}</span>
                    {active && (
                      <Loader2 className="h-4 w-4 animate-spin ml-auto text-primary" />
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
