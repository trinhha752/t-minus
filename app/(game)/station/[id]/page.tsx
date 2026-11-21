// Station screen: the map with this station's card open. Owner: World + run flow.
// CharacterChat, GuessGame and TriviaRound are unmounted for now (files untouched);
// remount them here once they do something.
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { StationView } from "@/components/run/views";
import { STATIONS } from "@/components/run/stations";

type Params = Promise<{ id: string }>;

export function generateStaticParams() {
  return STATIONS.map((s) => ({ id: s.id }));
}

export default function StationPage({ params }: { params: Params }) {
  // Cache Components: reading params must happen inside a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <Station params={params} />
    </Suspense>
  );
}

async function Station({ params }: { params: Params }) {
  const { id } = await params;
  if (!STATIONS.some((s) => s.id === id)) notFound();
  return <StationView id={id} />;
}
