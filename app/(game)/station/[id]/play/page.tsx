// Game screen. Harvard has its own game (Two Truths and a Lie); every other station plays Landmark Match.
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PlayView } from "@/components/run/views";
import { STATIONS } from "@/components/run/stations";

type Params = Promise<{ id: string }>;

export function generateStaticParams() {
  return STATIONS.map((s) => ({ id: s.id }));
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
  if (!STATIONS.some((s) => s.id === id)) redirect("/");
  return <PlayView id={id} />;
}
