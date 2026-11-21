// Game screen. Only Harvard has a game so far (Two Truths and a Lie).
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PlayView } from "@/components/run/views";
import { CURRENT_STATION } from "@/components/run/stations";

type Params = Promise<{ id: string }>;

export function generateStaticParams() {
  return [{ id: CURRENT_STATION }];
}

export default function PlayPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={null}>
      <Play params={params} />
    </Suspense>
  );
}

async function Play({ params }: { params: Params }) {
  const { id } = await params;
  if (id !== CURRENT_STATION) redirect(`/station/${id}`);
  return <PlayView id={id} />;
}
