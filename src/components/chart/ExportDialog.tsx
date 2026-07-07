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
  type ExportFormat,
  type ExportLayout,
  type LeadSheetVariant,
} from "@/lib/pdf/layouts";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (opts: {
    format: ExportFormat;
    layout: ExportLayout;
    variant?: LeadSheetVariant;
  }) => void;
  busy?: boolean;
}

export function ExportDialog({ open, onOpenChange, onConfirm, busy }: Props) {
  const [format, setFormat] = useState<ExportFormat>("pdf");
  const [layout, setLayout] = useState<ExportLayout>("blekker");
  const [variant, setVariant] = useState<LeadSheetVariant>("lyric");

  const activeVariants = LAYOUTS[layout].variants;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eksporter</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <section className="space-y-3">
            <p className="font-mono uppercase tracking-[0.18em] text-xs text-muted-foreground">
              Filtype
            </p>
            <RadioGroup
              value={format}
              onValueChange={(v) => setFormat(v as ExportFormat)}
              className="gap-2"
            >
              <FormatRow value="pdf" label="PDF" description="Én fil, sidebrytende A4-eksport." selected={format} />
              <FormatRow value="sheet" label="Per Sheet" description="Én PNG per seksjon." selected={format} />
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
                  <LayoutRow
                    key={id}
                    value={id}
                    label={l.label}
                    description={l.description}
                    selected={layout}
                    preview={id}
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
                  <FormatRow
                    key={v.id}
                    value={v.id}
                    label={v.label}
                    description={v.description}
                    selected={variant}
                  />
                ))}
              </RadioGroup>
            </section>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Avbryt
          </Button>
          <Button
            onClick={() =>
              onConfirm({
                format,
                layout,
                variant: activeVariants ? variant : undefined,
              })
            }
            disabled={busy}
          >
            {busy ? "Lager…" : "Eksporter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FormatRow({
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
      htmlFor={`fmt-${value}`}
      className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors ${
        active ? "border-primary bg-accent/30" : "border-border hover:bg-accent/20"
      }`}
    >
      <RadioGroupItem id={`fmt-${value}`} value={value} className="mt-1" />
      <div className="min-w-0">
        <div className="font-medium">{label}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
      </div>
    </Label>
  );
}

function LayoutRow({
  value,
  label,
  description,
  selected,
  preview,
}: {
  value: string;
  label: string;
  description: string;
  selected: string;
  preview: ExportLayout;
}) {
  const active = value === selected;
  return (
    <Label
      htmlFor={`layout-${value}`}
      className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors ${
        active ? "border-primary bg-accent/30" : "border-border hover:bg-accent/20"
      }`}
    >
      <RadioGroupItem id={`layout-${value}`} value={value} className="mt-1" />
      <div className="flex-1 min-w-0 flex items-start gap-3">
        <LayoutThumb kind={preview} />
        <div className="min-w-0">
          <div className="font-medium">{label}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
        </div>
      </div>
    </Label>
  );
}

function LayoutThumb({ kind }: { kind: ExportLayout }) {
  if (kind === "lead-sheet") {
    return (
      <div className="shrink-0 w-14 h-16 rounded-sm border border-border bg-white p-1.5 flex flex-col gap-1.5">
        <div className="mx-auto h-1 w-6 bg-black/80 rounded-sm" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="relative h-2.5">
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 space-y-[1px]">
              {[0, 1, 2, 3, 4].map((l) => (
                <div key={l} className="h-px bg-black/70" />
              ))}
            </div>
            <div className="absolute left-0 top-0 h-full w-px bg-black/70" />
            <div className="absolute left-1/2 top-0 h-full w-px bg-black/70" />
            <div className="absolute right-0 top-0 h-full w-px bg-black/70" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="shrink-0 w-14 h-16 rounded-sm border border-border bg-white p-1.5 flex flex-col gap-1">
      <div className="h-1.5 w-8 bg-black/80 rounded-sm" />
      <div className="h-0.5 w-5 bg-black/40 rounded-sm" />
      <div className="mt-1 grid grid-cols-4 gap-[2px]">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-2 border border-black/60" />
        ))}
      </div>
      <div className="mt-auto h-0.5 w-full bg-black/30" />
    </div>
  );
}
