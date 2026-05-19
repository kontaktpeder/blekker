import { cn } from "@/lib/utils";

interface Props {
  form: string[];
  large?: boolean;
}

function colorFor(name: string) {
  const n = name.toLowerCase();
  if (n.startsWith("chorus")) return "var(--color-section-chorus)";
  if (n.startsWith("verse")) return "var(--color-section-verse)";
  if (n.startsWith("bridge")) return "var(--color-section-bridge)";
  if (n.startsWith("intro")) return "var(--color-section-intro)";
  if (n.startsWith("outro")) return "var(--color-section-outro)";
  return "var(--muted-foreground)";
}

export function FormStrip({ form, large }: Props) {
  // collapse repeats: Chorus Chorus -> Chorus ×2
  const collapsed: { name: string; count: number }[] = [];
  for (const s of form) {
    const last = collapsed[collapsed.length - 1];
    if (last && last.name === s) last.count++;
    else collapsed.push({ name: s, count: 1 });
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-x-2 gap-y-3", large && "gap-x-3")}>
      {collapsed.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/60 px-3 py-1 font-mono uppercase tracking-wide tabular-nums",
              large ? "text-base md:text-lg px-5 py-2" : "text-xs md:text-sm"
            )}
          >
            <span
              aria-hidden
              className={cn("rounded-full", large ? "h-2.5 w-2.5" : "h-1.5 w-1.5")}
              style={{ background: colorFor(s.name) }}
            />
            <span style={{ color: colorFor(s.name) }}>{s.name}</span>
            {s.count > 1 && <span className="text-muted-foreground">×{s.count}</span>}
          </div>
          {i < collapsed.length - 1 && (
            <span className="text-muted-foreground/50 font-mono">→</span>
          )}
        </div>
      ))}
    </div>
  );
}
