import { createFileRoute } from "@tanstack/react-router";
import { LeadSheetChart } from "@/components/chart/LeadSheetChart";
import { SONGS } from "@/lib/songs";

export const Route = createFileRoute("/_dev/leadsheet")({
  component: DevLeadsheet,
});

function DevLeadsheet() {
  return (
    <div style={{ background: "#e5e5e5", padding: 24, minHeight: "100vh" }}>
      {SONGS.map((s) => (
        <div key={s.id} style={{ marginBottom: 40 }}>
          <LeadSheetChart song={s} semitones={0} showLyrics={true} />
        </div>
      ))}
    </div>
  );
}
