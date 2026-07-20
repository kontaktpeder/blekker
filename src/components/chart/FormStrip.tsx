import { cn } from "@/lib/utils";
import { sectionKindKey, type SectionKind } from "@/lib/section-labels-no";

interface Props {
  form: string[];
  large?: boolean;
}

const KIND_MARK: Partial<Record<SectionKind, string>> = {
  intro: "I",
  verse: "V",
  prechorus: "P",
  chorus: "R",
  bridge: "B",
  stick: "B",
  solo: "S",
  interlude: "M",
  outro: "O",
};

function markFor(name: string): string {
  const { kind } = sectionKindKey(name);
  return KIND_MARK[kind] ?? "·";
}

/**
 * Form as a compact rehearsal strip — not colorful AI pills.
 * Reads like a chart legend: V1 · R · V2 · R · B · R
 */
export function FormStrip({ form, large }: Props) {
  const collapsed: { name: string; count: number }[] = [];
  for (const s of form) {
    const last = collapsed[collapsed.length - 1];
    if (last && last.name === s) last.count++;
    else collapsed.push({ name: s, count: 1 });
  }

  return (
    <ol
      className={cn(
        "flex flex-wrap items-baseline gap-x-0 gap-y-1.5 font-mono text-muted-foreground",
        large ? "text-[13px] md:text-sm leading-relaxed" : "text-[11px] md:text-xs",
      )}
    >
      {collapsed.map((s, i) => (
        <li key={`${s.name}-${i}`} className="inline-flex items-baseline">
          {i > 0 && (
            <span className="mx-1.5 text-border select-none" aria-hidden>
              ·
            </span>
          )}
          <span className="inline-flex items-baseline gap-1 text-foreground/85">
            <span
              className="text-muted-foreground/70 tabular-nums"
              aria-hidden
              title={s.name}
            >
              {markFor(s.name)}
            </span>
            <span className="tracking-[0.04em]">{s.name}</span>
            {s.count > 1 && (
              <span className="text-muted-foreground tabular-nums text-[0.9em]">
                ×{s.count}
              </span>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}
