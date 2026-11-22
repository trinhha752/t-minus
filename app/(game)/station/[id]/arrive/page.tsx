// Arrive at a station: check in, brake into the platform, photo quest, stamp.
// Then on to /station/[id]/play. Owner: Backend + AI (components/game/ArriveView.tsx).
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ArriveView } from "@/components/game/ArriveView";
import { STATIONS } from "@/components/run/stations";

type Params = Promise<{ id: string }>;

export function generateStaticParams() {
  return STATIONS.map((s) => ({ id: s.id }));
}

export default function ArrivePage({ params }: { params: Params }) {
  return (
    <Suspense fallback={null}>
      <Arrive params={params} />
    </Suspense>
  );
}

async function Arrive({ params }: { params: Params }) {
  const { id } = await params;
  if (!STATIONS.some((s) => s.id === id)) redirect("/");
  return <ArriveView id={id} />;
}
