// Station screen. Owner: Frontend.
import { Suspense } from "react";
import CharacterChat from "@/components/CharacterChat";
import GuessGame from "@/components/GuessGame";
import TriviaRound from "@/components/TriviaRound";

type Params = Promise<{ id: string }>;

export default function StationPage({ params }: { params: Params }) {
  // Cache Components: reading params must happen inside a Suspense boundary.
  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <Suspense fallback={<p>Loading station…</p>}>
        <Station params={params} />
      </Suspense>
    </main>
  );
}

async function Station({ params }: { params: Params }) {
  const { id } = await params;
  return (
    <>
      <h1 className="text-2xl font-bold">Station: {id}</h1>
      <button className="w-fit rounded border px-4 py-2" type="button">
        Check in
      </button>
      <CharacterChat stationId={id} />
      <GuessGame stationId={id} />
      <TriviaRound stationId={id} />
    </>
  );
}
