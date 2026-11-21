// Results screen after a game.
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ResultsView } from "@/components/run/views";
import { CURRENT_STATION } from "@/components/run/stations";

type Params = Promise<{ id: string }>;

export function generateStaticParams() {
  return [{ id: CURRENT_STATION }];
}

export default function ResultsPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={null}>
      <Results params={params} />
    </Suspense>
  );
}

async function Results({ params }: { params: Params }) {
  const { id } = await params;
  if (id !== CURRENT_STATION) redirect(`/station/${id}`);
  return <ResultsView id={id} />;
}
