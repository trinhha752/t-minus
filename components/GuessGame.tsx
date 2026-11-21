// Arrival guess. Owner: Frontend.
// TODO: POST /api/guess, then poll /api/guess/[id] every 10s until resolved.
export default function GuessGame({ stationId }: { stationId: string }) {
  return <section className="rounded border p-3">Arrival guess for {stationId} goes here</section>;
}
