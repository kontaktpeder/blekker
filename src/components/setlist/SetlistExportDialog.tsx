import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  LAYOUTS,
  LAYOUT_ORDER,
  type ExportLayout,
  type LeadSheetVariant,
} from "@/lib/pdf/layouts";
import type { SetlistExportBundle } from "@/lib/pdf/exportSetlistCharts";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  songCount: number;
  onConfirm: (opts: {
    bundle: SetlistExportBundle;
    layout: ExportLayout;
    variant?: LeadSheetVariant;
  }) => void;
  busy?: boolean;
  progressLabel?: string | null;
}

export function SetlistExportDialog({
  open,
  onOpenChange,
  songCount,
  onConfirm,
  busy,
  progressLabel,
}: Props) {
  const [bundle, setBundle] = useState<SetlistExportBundle>("combined");
  const [layout, setLayout] = useState<ExportLayout>("blekker");
  const [variant, setVariant] = useState<LeadSheetVariant | undefined>(undefined);

  const activeVariants = LAYOUTS[layout].variants;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eksporter setlist ({songCount} låter)</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <section className="space-y-3">
            <p className="font-mono uppercase tracking-[0.18em] text-xs text-muted-foreground">
              Pakke
            </p>
            <RadioGroup
              value={bundle}
              onValueChange={(v) => setBundle(v as SetlistExportBundle)}
              className="gap-2"
            >
              <ChoiceRow
                value="combined"
                label="Én samlet PDF"
                description="Alle blekkene i én fil — bra for utskrift av hele settet."
                selected={bundle}
              />
              <ChoiceRow
                value="zip"
                label="ZIP med én PDF per låt"
                description="Separate filer i en mappe-arkiv."
                selected={bundle}
              />
            </RadioGroup>
          </section>

          <section className="space-y-3">
            <p className="font-mono uppercase tracking-[0.18em] text-xs text-muted-foreground">
              Layout
            </p>
            <RadioGroup
              value={layout}
              onValueChange={(v) => setLayout(v as ExportLayout)}
              className="gap-2"
            >
              {LAYOUT_ORDER.map((id) => {
                const l = LAYOUTS[id];
                return (
                  <ChoiceRow
                    key={id}
                    value={id}
                    label={l.label}
                    description={l.description}
                    selected={layout}
                  />
                );
              })}
            </RadioGroup>
          </section>

          {activeVariants && (
            <section className="space-y-3">
              <p className="font-mono uppercase tracking-[0.18em] text-xs text-muted-foreground">
                Stil
              </p>
              <RadioGroup
                value={variant}
                onValueChange={(v) => setVariant(v as LeadSheetVariant)}
                className="gap-2"
              >
                {activeVariants.map((v) => (
                  <ChoiceRow
                    key={v.id}
                    value={v.id}
                    label={v.label}
                    description={v.description}
                    selected={variant ?? ""}
                  />
                ))}
              </RadioGroup>
            </section>
          )}

          {busy && progressLabel && (
            <p className="text-sm text-muted-foreground font-mono truncate">
              {progressLabel}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Avbryt
          </Button>
          <Button
            onClick={() =>
              onConfirm({
                bundle,
                layout,
                variant: activeVariants ? variant : undefined,
              })
            }
            disabled={busy || songCount === 0}
          >
            {busy ? "Lager…" : "Eksporter alle"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChoiceRow({
  value,
  label,
  description,
  selected,
}: {
  value: string;
  label: string;
  description: string;
  selected: string;
}) {
  const active = value === selected;
  return (
    <Label
      htmlFor={`setlist-export-${value}`}
      className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors ${
        active ? "border-primary bg-accent/30" : "border-border hover:bg-accent/20"
      }`}
    >
      <RadioGroupItem id={`setlist-export-${value}`} value={value} className="mt-1" />
      <div className="min-w-0">
        <div className="font-medium">{label}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
      </div>
    </Label>
  );
}
